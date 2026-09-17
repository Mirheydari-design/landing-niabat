import React, { useState, useEffect } from 'react';
import { OrderItem, AppStats } from '../types';
import { formatToman } from '../data/initialData';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Users,
  Coins,
  ArrowRight,
  Database
} from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [tokenInput, setTokenInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [is503Unavailable, setIs503Unavailable] = useState<boolean>(false);

  const [stats, setStats] = useState<AppStats | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  const baseUrl = import.meta.env.BASE_URL || '/';

  // Check if admin is already authenticated via cookie
  const fetchAdminData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`${baseUrl}api/admin/data`, {
        headers: { 'Accept': 'application/json' }
      });

      if (res.status === 503) {
        setIs503Unavailable(true);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        setIsLoadingData(false);
        return;
      }

      if (res.status === 401) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        setIsLoadingData(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setIs503Unavailable(false);
        if (data.stats) setStats(data.stats);
        if (data.orders) setOrders(data.orders);
      }
    } catch {
      // Network error
    } finally {
      setIsCheckingAuth(false);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch(`${baseUrl}api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() })
      });

      if (res.status === 503) {
        setIs503Unavailable(true);
        setLoginError('متغیر ADMIN_TOKEN در سرور تنظیم نشده است (503 Service Unavailable).');
        return;
      }

      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthenticated(true);
        setTokenInput('');
        fetchAdminData();
      } else {
        setLoginError(json.error || 'توکن وارد شده نادرست است.');
      }
    } catch {
      setLoginError('خطا در ارتباط با سرور.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${baseUrl}api/admin/logout`, { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    setOrders([]);
    setStats(null);
  };

  const handleDownloadCsv = () => {
    window.location.href = `${baseUrl}api/admin/download-csv`;
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'paid' && o.status !== 'paid') return false;
      if (statusFilter === 'pending' && o.status !== 'pending') return false;
      if (statusFilter === 'failed' && (o.status === 'paid' || o.status === 'pending')) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q)) ||
      (o.amal && o.amal.toLowerCase().includes(q)) ||
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.paymentRef && o.paymentRef.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 min-h-screen text-slate-100 font-sans" dir="rtl">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">داشبورد مدیریت خانه زیارت</h1>
            <p className="text-xs text-slate-400">بانک اطلاعاتی SQLite و سامانه تسویه درگاه پرداخت</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-800/50 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>بازگشت به سایت</span>
          </button>
        </div>
      </div>

      {isCheckingAuth ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          در حال بررسی دسترسی مدیریت...
        </div>
      ) : is503Unavailable ? (
        /* 503 Fail-Closed State */
        <div className="bg-slate-900 border border-rose-800/40 rounded-3xl p-8 max-w-md mx-auto text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-rose-400">خطای ۵۰۳ — سرویس مدیریت غیرفعال است</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            طبق الزامات پروتکل خانه زیارت، متغیر محیطی <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 font-mono">ADMIN_TOKEN</code> بر روی سرور مقداردهی نشده است و دسترسی به پنل به‌صورت <strong>Fail-Closed</strong> مسدود می‌باشد.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-right">
            جهت فعال‌سازی، مقدار <span className="font-mono text-amber-400">ADMIN_TOKEN</span> را در متغیرهای محیطی سرور تنظیم نمایید.
          </div>
        </div>
      ) : !isAuthenticated ? (
        /* Login Screen */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-100">ورود مدیر سیستم</h2>
            <p className="text-xs text-slate-400">
              جهت دسترسی به دیتابیس و اطلاعات پرداخت‌ها، توکن مدیریت را وارد فرمایید.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                توکن دسترسی مدیریت (ADMIN_TOKEN):
              </label>
              <input
                type="password"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="توکن محرمانه..."
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 font-mono"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>{isLoggingIn ? 'در حال اعتبارسنجی امن...' : 'ورود به پنل'}</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            * احراز هویت با استفاده از الگوریتم ایمن <code className="text-amber-300">timingSafeEqual</code> و کوکی محافظت‌شده HttpOnly انجام می‌شود.
          </p>
        </div>
      ) : (
        /* Authenticated Admin Dashboard */
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>کل بازدیدها</span>
                </div>
                <div className="text-xl font-black text-slate-100">{stats.totalViews}</div>
                <div className="text-[10px] text-slate-500">
                  {stats.uniqueViews} بازدیدکننده یکتا (هش شده)
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>پرداخت‌های موفق</span>
                </div>
                <div className="text-xl font-black text-emerald-400">{stats.totalPaidOrders}</div>
                <div className="text-[10px] text-slate-500">از مجموع {stats.totalOrders} درخواست</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>مجموع واریزی‌ها</span>
                </div>
                <div className="text-lg sm:text-xl font-black text-amber-300 truncate">
                  {formatToman(stats.totalPaidAmount)}
                </div>
                <div className="text-[10px] text-slate-500">تومان</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>نرخ تبدیل</span>
                </div>
                <div className="text-xl font-black text-teal-400">{stats.conversionRate}٪</div>
                <div className="text-[10px] text-slate-500">نسبت پرداخت به بازدید</div>
              </div>
            </div>
          )}

          {/* Action Header: Search, Filter, Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام، شماره تماس، عمل یا شناسه..."
                className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>

            {/* Filter Tabs & Export */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  همه ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'paid' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  موفق ({orders.filter((o) => o.status === 'paid').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  معلق
                </button>
              </div>

              <button
                type="button"
                onClick={fetchAdminData}
                disabled={isLoadingData}
                title="تازه‌سازی داده‌ها"
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>خروجی اکسل (CSV)</span>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">شناسه / تاریخ</th>
                    <th className="p-3">نام و نام خانوادگی</th>
                    <th className="p-3">شماره همراه</th>
                    <th className="p-3">عمل / نیت</th>
                    <th className="p-3">مبلغ (تومان)</th>
                    <th className="p-3">وضعیت پرداخت</th>
                    <th className="p-3">کد رهگیری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        {isLoadingData ? 'در حال بارگذاری داده‌ها...' : 'هیچ سفارشی مطابق جستجو یافت نشد.'}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const isPaid = order.status === 'paid';
                      const isPending = order.status === 'pending';
                      const isMismatch = order.status === 'amount_mismatch';

                      return (
                        <tr key={order.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-3">
                            <div className="font-mono text-[11px] text-amber-300 font-medium">
                              {order.id}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{order.createdAt}</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-100">{order.name}</td>
                          <td className="p-3 font-mono text-slate-300" dir="ltr">
                            {order.phone}
                          </td>
                          <td className="p-3 max-w-[200px]">
                            <div className="font-medium text-slate-200 truncate">{order.amal}</div>
                            {order.niyyat && order.niyyat !== order.amal && (
                              <div className="text-[10px] text-slate-400 truncate">نیت: {order.niyyat}</div>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-100">
                            {formatToman(order.amount)}
                          </td>
                          <td className="p-3">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>موفق</span>
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/50">
                                <Clock className="w-3 h-3" />
                                <span>در انتظار درگاه</span>
                              </span>
                            ) : isMismatch ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/50">
                                <AlertCircle className="w-3 h-3" />
                                <span>مغایرت مبلغ</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/50">
                                <AlertCircle className="w-3 h-3" />
                                <span>ناموفق</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">
                            {order.paymentRef || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>تعداد کل رکوردهای ثبت شده در SQLite: {orders.length}</span>
              <span>خروجی اکسل با محافظت کامل در برابر تزریق فرمول (Formula Injection) تولید می‌شود.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
