import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Section 5: DATA_DIR in container is /app/data, fallback to ./data
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'app.sqlite');
export const db = new Database(dbPath);

// Enable Write-Ahead Logging for high concurrency and resilience
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize database schema with prepared statements
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    amal TEXT NOT NULL,
    niyyat TEXT,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    paid_at TEXT,
    settled_at TEXT,
    created_at TEXT NOT NULL,
    ip_hash TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_orders_entry_id ON orders(entry_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_page_views_ip_hash ON page_views(ip_hash);
  CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
`);

export interface DbOrder {
  id: number;
  entry_id: string;
  name: string;
  phone: string;
  amal: string;
  niyyat: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'amount_mismatch';
  transaction_id: string | null;
  paid_at: string | null;
  settled_at: string | null;
  created_at: string;
  ip_hash: string | null;
}

// Prepared statements for orders
const insertOrderStmt = db.prepare(`
  INSERT INTO orders (entry_id, name, phone, amal, niyyat, amount, status, created_at, ip_hash)
  VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
`);

const findOrderByEntryIdStmt = db.prepare(`
  SELECT * FROM orders WHERE entry_id = ?
`);

const updateOrderSettledStmt = db.prepare(`
  UPDATE orders
  SET status = ?, transaction_id = ?, paid_at = ?, settled_at = ?
  WHERE entry_id = ?
`);

const updateOrderStatusStmt = db.prepare(`
  UPDATE orders
  SET status = ?, settled_at = ?
  WHERE entry_id = ?
`);

const getAllOrdersStmt = db.prepare(`
  SELECT * FROM orders ORDER BY id DESC
`);

const getPublicStatsStmt = db.prepare(`
  SELECT 
    COUNT(*) as total_orders,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as total_paid_orders,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid_amount
  FROM orders
`);

// Prepared statements for page views
const insertPageViewStmt = db.prepare(`
  INSERT INTO page_views (ip_hash, created_at)
  VALUES (?, ?)
`);

const getViewsStatsStmt = db.prepare(`
  SELECT 
    COUNT(*) as total_views,
    COUNT(DISTINCT ip_hash) as unique_views
  FROM page_views
`);

export const dbService = {
  createOrder(data: {
    entryId: string;
    name: string;
    phone: string;
    amal: string;
    niyyat?: string;
    amount: number;
    createdAt: string;
    ipHash?: string;
  }) {
    insertOrderStmt.run(
      data.entryId,
      data.name,
      data.phone,
      data.amal,
      data.niyyat || 'عمومی',
      data.amount,
      data.createdAt,
      data.ipHash || null
    );
    return findOrderByEntryIdStmt.get(data.entryId) as DbOrder;
  },

  getOrderByEntryId(entryId: string): DbOrder | undefined {
    return findOrderByEntryIdStmt.get(entryId) as DbOrder | undefined;
  },

  settleOrder(entryId: string, status: 'paid' | 'amount_mismatch', transactionId: string | null, paidAt: string | null) {
    const now = new Date().toISOString();
    updateOrderSettledStmt.run(status, transactionId, paidAt, now, entryId);
    return findOrderByEntryIdStmt.get(entryId) as DbOrder;
  },

  markOrderFailed(entryId: string, status: 'failed' = 'failed') {
    const now = new Date().toISOString();
    updateOrderStatusStmt.run(status, now, entryId);
    return findOrderByEntryIdStmt.get(entryId) as DbOrder;
  },

  getAllOrders(): DbOrder[] {
    return getAllOrdersStmt.all() as DbOrder[];
  },

  recordPageView(ipHash: string) {
    insertPageViewStmt.run(ipHash, new Date().toISOString());
  },

  getStats() {
    const views = getViewsStatsStmt.get() as { total_views: number; unique_views: number };
    const orders = getPublicStatsStmt.get() as {
      total_orders: number;
      total_paid_orders: number;
      total_paid_amount: number;
    };

    const totalViews = views?.total_views || 0;
    const uniqueViews = views?.unique_views || 0;
    const totalPaidOrders = orders?.total_paid_orders || 0;
    const totalPaidAmount = orders?.total_paid_amount || 0;
    const conversionRate = totalViews > 0
      ? parseFloat(((totalPaidOrders / totalViews) * 100).toFixed(1))
      : 0;

    return {
      totalViews,
      uniqueViews,
      totalOrders: orders?.total_orders || 0,
      totalPaidOrders,
      totalPaidAmount,
      conversionRate
    };
  }
};
