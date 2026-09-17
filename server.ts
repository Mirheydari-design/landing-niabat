import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { dbService, DbOrder } from './server/db.js';
import { buildGatewayUrl, interpretCallback } from './server/gateway.js';

const app = express();
const PORT = 3000;

// Section 8: app.set('trust proxy', true) behind Nginx/Caddy proxies
app.set('trust proxy', true);

// Section 8: Payload size limit 64kb
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(cookieParser());

// -------------------------------------------------------------
// Security & Helper Functions
// -------------------------------------------------------------

// Visitor IP hashing per Section 8 & 10: Never store raw IP; hash with VISITOR_SALT
function getHashedIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || '127.0.0.1';
  const salt = process.env.VISITOR_SALT || 'ziyarat_home_default_salt';
  return crypto.createHash('sha256').update(`${salt}:${rawIp.trim()}`).digest('hex');
}

// Timing-safe admin authentication comparison
function isTimingSafeEqual(aStr: string, bStr: string): boolean {
  try {
    const a = Buffer.from(aStr);
    const b = Buffer.from(bStr);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifyAdmin(req: express.Request): { authorized: boolean; tokenMissing: boolean } {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || !adminToken.trim()) {
    // Fail-Closed: If ADMIN_TOKEN is not set in environment, must return 503
    return { authorized: false, tokenMissing: true };
  }

  // Check Bearer header, custom header, cookie, or query parameter
  let candidate = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    candidate = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    candidate = String(req.headers['x-admin-token']).trim();
  } else if (req.cookies && req.cookies['ziyarat_admin_token']) {
    candidate = String(req.cookies['ziyarat_admin_token']).trim();
  } else if (req.query.key) {
    candidate = String(req.query.key).trim();
  }

  if (!candidate) {
    return { authorized: false, tokenMissing: false };
  }

  return {
    authorized: isTimingSafeEqual(candidate, adminToken.trim()),
    tokenMissing: false
  };
}

// In-memory rate limiting to prevent spam
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
function checkRateLimit(key: string, maxLimit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.expiresAt <= now) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxLimit) {
    return false;
  }
  entry.count += 1;
  return true;
}

// CSV cell escaping with formula injection defense per Section 8
const FORMULA_LEAD = /^[=+\-@\t\r]/;
function csvCell(value: any): string {
  let s = value == null ? '' : String(value);
  if (FORMULA_LEAD.test(s)) {
    s = "'" + s; // Neutralize formula execution in spreadsheet software
  }
  return '"' + s.replace(/"/g, '""') + '"'; // Double quotes for standard CSV escaping
}

// -------------------------------------------------------------
// Public Endpoints
// -------------------------------------------------------------

// Health check endpoint for container lifecycle
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Record page view (GET or POST)
app.all('/api/view', (req, res) => {
  try {
    const ipHash = getHashedIp(req);
    dbService.recordPageView(ipHash);
    const stats = dbService.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در ثبت بازدید' });
  }
});

// Public aggregate statistics (No personal data per Section 8)
app.get('/api/stats', (_req, res) => {
  try {
    const stats = dbService.getStats();
    res.json({ success: true, stats });
  } catch {
    res.status(500).json({ success: false, message: 'خطا در دریافت آمار' });
  }
});

// Donation card info if configured (card-to-card metadata)
app.get('/api/donation-info', (_req, res) => {
  const cardNumber = process.env.DONATION_CARD_NUMBER;
  const cardHolder = process.env.DONATION_CARD_HOLDER;
  res.json({
    hasCard: Boolean(cardNumber && cardNumber.trim()),
    cardNumber: cardNumber ? cardNumber.trim() : null,
    cardHolder: cardHolder ? cardHolder.trim() : null
  });
});

// POST /api/orders - Initiate order and generate gateway redirect URL
app.post('/api/orders', (req, res) => {
  const ipHash = getHashedIp(req);
  if (!checkRateLimit(`order_${ipHash}`, 20, 60 * 1000)) {
    return res.status(429).json({
      success: false,
      message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً یک دقیقه دیگر تلاش فرمایید.'
    });
  }

  const { name, phone, amal, niyyat, amount, callbackUrl } = req.body || {};

  // Validation: Iranian mobile regex
  const mobileRegex = /^09\d{9}$/;
  const cleanPhone = String(phone || '').trim();
  const cleanName = String(name || '').trim();
  const cleanAmal = String(amal || '').trim();
  const cleanNiyyat = String(niyyat || cleanAmal || 'عمومی').trim();
  const cleanAmount = Math.round(Number(amount));

  if (!cleanName || cleanName.length > 100) {
    return res.status(400).json({ success: false, message: 'لطفاً نام و نام خانوادگی را به درستی وارد فرمایید.' });
  }

  if (!mobileRegex.test(cleanPhone)) {
    return res.status(400).json({ success: false, message: 'شماره همراه باید به فرمت صحیح ۱۱ رقمی باشد (مثال: ۰۹۱۲۳۴۵۶۷۸۹).' });
  }

  if (!cleanAmal || cleanAmal.length > 255) {
    return res.status(400).json({ success: false, message: 'لطفاً عمل یا دعای درخواستی را وارد فرمایید.' });
  }

  if (!Number.isFinite(cleanAmount) || cleanAmount < 50000 || cleanAmount > 1000000000) {
    return res.status(400).json({ success: false, message: 'مبلغ اهدایی نامعتبر است. حداقل مبلغ ۵۰,۰۰۰ تومان است.' });
  }

  // Create unique entry_id
  const entryId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date();
  const dateFa = now.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' });
  const timeFa = now.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
  const createdAtFormatted = `${dateFa} - ${timeFa}`;

  try {
    // 1. Insert order into SQLite database with status 'pending'
    const order = dbService.createOrder({
      entryId,
      name: cleanName,
      phone: cleanPhone,
      amal: cleanAmal,
      niyyat: cleanNiyyat,
      amount: cleanAmount,
      createdAt: createdAtFormatted,
      ipHash
    });

    // 2. Build official Ziarat Home gateway redirect URL
    const merchantDomain = process.env.MERCHANT_DOMAIN || req.hostname || 'landing.ziarathome.ir';
    
    // Use provided callbackUrl or construct default from request origin
    let ref = callbackUrl;
    if (!ref) {
      const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      ref = `${proto}://${req.get('host')}/`;
    }

    const gatewayUrl = buildGatewayUrl({
      name: cleanName,
      phone: cleanPhone,
      callbackUrl: ref,
      entryId,
      merchantDomain,
      amountToman: cleanAmount
    });

    return res.json({
      success: true,
      entryId,
      gatewayUrl,
      order: {
        entryId: order.entry_id,
        amount: order.amount,
        createdAt: order.created_at
      }
    });
  } catch (err) {
    console.error('Error creating order in db:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور در ثبت سفارش.' });
  }
});

// POST /api/orders/:entryId/settle - Settle callback parameters sent from gateway
app.post('/api/orders/:entryId/settle', (req, res) => {
  const { entryId } = req.params;
  const callbackParams = req.body || {};

  try {
    const order = dbService.getOrderByEntryId(entryId);
    if (!order) {
      return res.status(404).json({ outcome: 'failed', reason: 'order_not_found' });
    }

    // Interpret gateway callback with idempotency and amount verification
    const outcomeResult = interpretCallback(callbackParams, order);

    if (outcomeResult.outcome === 'already_paid') {
      return res.json({
        outcome: 'already_paid',
        order: {
          id: order.entry_id,
          name: order.name,
          phone: order.phone,
          amal: order.amal,
          niyyat: order.niyyat,
          amount: order.amount,
          status: 'paid',
          paymentRef: order.transaction_id || 'تأیید شده',
          createdAt: order.created_at,
          paidAt: order.paid_at
        }
      });
    }

    if (outcomeResult.outcome === 'paid') {
      const updated = dbService.settleOrder(
        entryId,
        'paid',
        outcomeResult.transactionId || null,
        outcomeResult.paidAt || null
      );
      return res.json({
        outcome: 'paid',
        order: {
          id: updated.entry_id,
          name: updated.name,
          phone: updated.phone,
          amal: updated.amal,
          niyyat: updated.niyyat,
          amount: updated.amount,
          status: updated.status,
          paymentRef: updated.transaction_id || 'تأیید شده',
          createdAt: updated.created_at,
          paidAt: updated.paid_at
        }
      });
    }

    if (outcomeResult.outcome === 'amount_mismatch') {
      const updated = dbService.settleOrder(
        entryId,
        'amount_mismatch',
        callbackParams.transaction || null,
        callbackParams.date || null
      );
      return res.json({
        outcome: 'amount_mismatch',
        reportedAmount: outcomeResult.reportedAmount,
        expectedAmount: outcomeResult.expectedAmount,
        order: {
          id: updated.entry_id,
          status: updated.status
        }
      });
    }

    // Other failed outcomes
    dbService.markOrderFailed(entryId, 'failed');
    return res.json({
      outcome: 'failed',
      reason: outcomeResult.reason || 'پرداخت توسط درگاه تأیید نشد'
    });
  } catch (err) {
    console.error('Error settling order:', err);
    return res.status(500).json({ outcome: 'failed', reason: 'خطای سرور در تسویه حساب' });
  }
});

// GET /api/orders/:entryId - Get single order receipt details
app.get('/api/orders/:entryId', (req, res) => {
  const { entryId } = req.params;
  try {
    const order = dbService.getOrderByEntryId(entryId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد.' });
    }

    return res.json({
      success: true,
      order: {
        id: order.entry_id,
        name: order.name,
        phone: order.phone,
        amal: order.amal,
        niyyat: order.niyyat,
        amount: order.amount,
        status: order.status,
        paymentRef: order.transaction_id || (order.status === 'paid' ? 'تأیید شده' : null),
        createdAt: order.created_at,
        paidAt: order.paid_at
      }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'خطا در دریافت اطلاعات سفارش.' });
  }
});

// -------------------------------------------------------------
// Admin Endpoints & Security (Section 6, 8, 10)
// -------------------------------------------------------------

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || !adminToken.trim()) {
    return res.status(503).json({
      success: false,
      error: 'ADMIN_TOKEN در متغیرهای محیطی سرور تنظیم نشده است (503 Service Unavailable).'
    });
  }

  const ipHash = getHashedIp(req);
  if (!checkRateLimit(`admin_login_${ipHash}`, 6, 5 * 60 * 1000)) {
    return res.status(429).json({
      success: false,
      error: 'تعداد تلاش‌های ناموفق بیش از حد بود. لطفاً ۵ دقیقه دیگر مراجعه فرمایید.'
    });
  }

  const { token, password } = req.body || {};
  const candidate = String(token || password || '').trim();

  if (isTimingSafeEqual(candidate, adminToken.trim())) {
    // Exchange token with HttpOnly + Secure + SameSite=Strict cookie
    res.cookie('ziyarat_admin_token', adminToken.trim(), {
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.json({ success: true, message: 'ورود به پنل مدیریت موفقیت‌آمیز بود.' });
  }

  return res.status(401).json({ success: false, error: 'توکن وارد شده نادرست است.' });
});

// Admin logout
app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie('ziyarat_admin_token');
  res.json({ success: true });
});

// Admin data retrieval endpoint
app.get('/api/admin/data', (req, res) => {
  const auth = verifyAdmin(req);

  if (auth.tokenMissing) {
    return res.status(503).json({
      success: false,
      error: 'ADMIN_TOKEN تنظیم نشده است (۵۰۳ Fail Closed).'
    });
  }

  if (!auth.authorized) {
    return res.status(401).json({
      success: false,
      error: 'دسترسی غیرمجاز. لطفاً توکن مدیریت را وارد فرمایید.'
    });
  }

  try {
    const orders = dbService.getAllOrders();
    const stats = dbService.getStats();

    return res.json({
      success: true,
      stats,
      orders: orders.map((o) => ({
        id: o.id,
        entryId: o.entry_id,
        name: o.name,
        phone: o.phone,
        amal: o.amal,
        niyyat: o.niyyat,
        amount: o.amount,
        status: o.status,
        transactionId: o.transaction_id,
        paidAt: o.paid_at,
        settledAt: o.settled_at,
        createdAt: o.created_at
      }))
    });
  } catch (err) {
    console.error('Admin data error:', err);
    return res.status(500).json({ success: false, error: 'خطا در واکشی داده‌های دیتابیس' });
  }
});

// Admin CSV export endpoint per Section 8
app.get(['/api/admin/download-csv', '/api/admin/orders.csv'], (req, res) => {
  const auth = verifyAdmin(req);

  if (auth.tokenMissing) {
    return res.status(503).send('ADMIN_TOKEN not configured (503)');
  }

  if (!auth.authorized) {
    return res.status(401).send('Unauthorized. Please provide valid ADMIN_TOKEN');
  }

  try {
    const orders = dbService.getAllOrders();
    const bom = '\uFEFF';
    const header = [
      csvCell('شناسه'),
      csvCell('شناسه سفارش'),
      csvCell('نام و نام خانوادگی'),
      csvCell('شماره همراه'),
      csvCell('عمل یا دعای درخواستی'),
      csvCell('به نیت'),
      csvCell('مبلغ (تومان)'),
      csvCell('وضعیت'),
      csvCell('کد رهگیری تراکنش'),
      csvCell('تاریخ ثبت'),
      csvCell('تاریخ پرداخت')
    ].join(',') + '\n';

    const rows = orders.map((o) => {
      const statusFa = o.status === 'paid' ? 'پرداخت شده' : o.status === 'amount_mismatch' ? 'مغایرت مبلغ' : o.status === 'failed' ? 'ناموفق' : 'در انتظار پرداخت';
      return [
        csvCell(o.id),
        csvCell(o.entry_id),
        csvCell(o.name),
        csvCell(o.phone),
        csvCell(o.amal),
        csvCell(o.niyyat || ''),
        csvCell(o.amount),
        csvCell(statusFa),
        csvCell(o.transaction_id || ''),
        csvCell(o.created_at),
        csvCell(o.paid_at || '')
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ziyarat_orders_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(bom + header + rows);
  } catch (err) {
    console.error('CSV export error:', err);
    return res.status(500).send('خطا در تولید فایل CSV');
  }
});

// Admin Route (/admin) - Exchange ?key= with HttpOnly cookie & enforce Fail-Closed
app.get('/admin', (req, res, next) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || !adminToken.trim()) {
    res.status(503).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سرویس غیرفعال است (۵۰۳)</title>
        <meta name="referrer" content="no-referrer">
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          h1 { color: #f43f5e; font-size: 1.3rem; margin-bottom: 0.75rem; }
          p { color: #94a3b8; font-size: 0.875rem; line-height: 1.6; }
          code { background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 0.4rem; color: #38bdf8; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>خطای ۵۰۳ — سرویس مدیریت غیرفعال است</h1>
          <p>متغیر <code>ADMIN_TOKEN</code> در محیط سرور تنظیم نشده است. طبق الزامات امنیتی پروتکل، دسترسی به پنل مدیریت تا زمان مقداردهی این متغیر به‌صورت <strong>Fail-Closed</strong> مسدود می‌باشد.</p>
        </div>
      </body>
      </html>
    `);
  }

  // If request includes ?key=, verify and exchange for HttpOnly cookie
  if (req.query.key) {
    const key = String(req.query.key).trim();
    if (isTimingSafeEqual(key, adminToken.trim())) {
      res.cookie('ziyarat_admin_token', adminToken.trim(), {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
      // Redirect to /admin without the query parameter to keep URL clean and secure
      return res.redirect('/admin');
    }
  }

  // Pass to frontend router / static handler
  next();
});

// -------------------------------------------------------------
// Serve Static Assets from Public
// -------------------------------------------------------------
app.use(express.static(path.join(process.cwd(), 'public')));

// -------------------------------------------------------------
// Start Express Server with Vite Middleware
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
