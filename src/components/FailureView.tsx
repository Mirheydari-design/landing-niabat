import React from 'react';
import { AlertCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { formatToman } from '../data/initialData';

interface FailureViewProps {
  outcome: 'failed' | 'amount_mismatch' | string;
  reportedAmount?: number;
  expectedAmount?: number;
  onRetry: () => void;
}

export const FailureView: React.FC<FailureViewProps> = ({
  outcome,
  reportedAmount,
  expectedAmount,
  onRetry
}) => {
  const isMismatch = outcome === 'amount_mismatch';

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col justify-between min-h-[95vh] py-6 px-4" dir="rtl">
      <div className="my-auto bg-slate-900 rounded-3xl shadow-xl shadow-rose-950/20 border border-slate-800 overflow-hidden">
        {/* Banner */}
        <div className="relative w-full h-[220px] bg-slate-950 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-radial from-rose-950/40 to-slate-950" />
          <div className="relative text-center space-y-3 z-10 px-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              {isMismatch ? <ShieldAlert className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>
            <h2 className="text-lg font-bold text-rose-300">
              {isMismatch ? 'مغایرت در مبلغ واریزی' : 'پرداخت ناموفق'}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-center">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-right">
            <p className="text-xs text-slate-300 leading-relaxed">
              {isMismatch
                ? 'مبلغ تأیید شده توسط درگاه پرداخت با مبلغ سفارش شما همخوانی ندارد. وضعیت سفارش شما به عنوان مغایرت مبلغ ثبت شد تا توسط کارشناسان بررسی گردد.'
                : 'فرآیند پرداخت در درگاه بانکی تکمیل نشد یا توسط کاربر لغو گردید. در صورتی که مبلغی از حساب شما کسر شده است، طبق قوانین شبکه شتاب طی حداکثر ۷۲ ساعت به حساب شما عودت داده خواهد شد.'}
            </p>

            {isMismatch && reportedAmount && expectedAmount && (
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>مبلغ مورد انتظار:</span>
                  <span className="text-slate-200">{formatToman(expectedAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>مبلغ گزارش شده:</span>
                  <span>{formatToman(reportedAmount)}</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onRetry}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-950" />
            <span>تلاش مجدد و بازگشت به صفحه اصلی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
