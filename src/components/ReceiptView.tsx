import React from 'react';
import { OrderItem } from '../types';
import { formatToman } from '../data/initialData';
import {
  CheckCircle2,
  ArrowRight,
  BookOpen,
  User,
  Phone,
  ReceiptText,
  Coins,
  Video
} from 'lucide-react';

interface ReceiptViewProps {
  item: OrderItem;
  onBackToLanding: () => void;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  item,
  onBackToLanding
}) => {
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col justify-between min-h-[95vh] py-6 px-4" dir="rtl">
      <div className="my-auto bg-slate-900 rounded-3xl shadow-xl shadow-amber-900/10 border border-slate-800 overflow-hidden">
        {/* Holy Shrine Visual Banner */}
        <div className="relative w-full h-[384px] bg-slate-950 overflow-hidden">
          <img
            src="/Gemini_Generated_Image_ne51ctne51ctne51.png"
            alt="حرم مطهر کربلا"
            className="w-full h-full object-cover object-center brightness-90 transition-transform duration-700 hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('header-current')) {
                target.src = '/header-current.png';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none" />

          <div className="absolute bottom-4 inset-x-4 text-center">
            <span className="text-xs font-semibold text-amber-200/90 drop-shadow-sm">
              خانه زیارت • ثبت نیابت و اعزام زائر اولی
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Success Banner with Amount */}
          <div className="bg-gradient-to-b from-emerald-950/50 via-slate-900/95 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 text-center shadow-lg shadow-emerald-950/20">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-xs mb-2.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="py-0.5">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight drop-shadow-sm">
                {formatToman(item.amount)}
              </div>
            </div>

            <div className="w-16 h-px bg-emerald-500/25 mx-auto my-2.5" />

            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                پرداخت شما با موفقیت انجام شد
              </h2>
            </div>
          </div>

          {/* Video Recording Assurance Card */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/35 rounded-2xl p-3.5 flex items-start gap-3 text-right shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
              <Video className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>ارسال ویدیوی اختصاصی</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                  تضمین انجام
                </span>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed font-normal">
                از انجام عملی که درخواست کردید در حرم مطهر فیلم‌برداری می‌کنیم و فیلم آن را برای شما ارسال خواهیم کرد.
              </p>
            </div>
          </div>

          {/* Spiritual Statement */}
          <div className="bg-amber-950/25 border border-amber-500/30 rounded-2xl p-3.5 space-y-2 text-right">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span>محل صرف هزینه پرداختی:</span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed font-normal">
              با نیت خیر شما، مبلغ پرداختی به‌طور کامل صرف{' '}
              <strong className="text-amber-300 font-bold">کمک‌هزینه سفر و اعزام زائر به کربلای معلی</strong> می‌گردد.
            </p>
          </div>

          {/* Digital Receipt Card */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-700/80 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <ReceiptText className="w-3.5 h-3.5 text-amber-500" />
                <span>مشخصات فیش نیابت</span>
              </span>
              <span className="font-mono text-[11px] text-amber-400">
                {item.paymentRef || 'تأیید شده'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>پرداخت‌کننده:</span>
                </span>
                <span className="font-bold text-slate-100">{item.name}</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>شماره همراه:</span>
                </span>
                <span className="font-mono text-slate-200" dir="ltr">
                  {item.phone}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex justify-between items-start text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1 shrink-0">
                    <BookOpen className="w-3 h-3 text-amber-500" />
                    <span>عمل درخواستی:</span>
                  </span>
                  <span className="font-bold text-slate-200 text-left pr-2 break-words">
                    {item.amal}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-800/70">
                <span>شناسه ثبت:</span>
                <span className="font-mono">{item.id}</span>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>زمان ثبت تراکنش:</span>
                <span>{item.paidAt || item.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onBackToLanding}
              id="btn-back-to-landing"
              className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-slate-950" />
              <span>بازگشت به صفحه اصلی (ثبت نیت جدید)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
