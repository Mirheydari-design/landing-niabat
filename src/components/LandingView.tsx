import React, { useState, useEffect } from 'react';
import headerImage from '../assets/header.webp';
import { formatToman } from '../data/initialData';
import { DonationCardInfo } from '../types';
import {
  HeartHandshake,
  ShieldCheck,
  CreditCard,
  Lock,
  AlertCircle,
  User,
  PenLine
} from 'lucide-react';

interface LandingViewProps {
  onSubmitOrder: (data: {
    name: string;
    phone: string;
    amal: string;
    niyyat: string;
    amount: number;
  }) => Promise<{ success: boolean; message?: string }>;
  onOpenAdmin: () => void;
  donationInfo?: DonationCardInfo | null;
}

const MIN_AMOUNT_TOMAN = 50000;

const SUGGESTED_AMOUNTS = [
  { label: '۵۰۰ هزار تومان', value: 500000 },
  { label: '۱.۵ میلیون تومان', value: 1500000 },
  { label: '۵ میلیون تومان', value: 5000000 },
];

function parseTomanAmount(val: string): number {
  const pDigits = '۰۱۲۳۴۵۶۷۸۹';
  const aDigits = '٠١٢٣٤٥٦٧٨٩';
  let s = val;
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(pDigits[i], String(i)).replaceAll(aDigits[i], String(i));
  }
  const digitsOnly = s.replace(/[^\d]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

function formatNumberWithCommas(num: number): string {
  if (!num || isNaN(num)) return '';
  return new Intl.NumberFormat('fa-IR').format(num);
}

const SUGGESTED_AMALS = [
  'یا حسین، به علی‌اصغرت قسم شفای بیمارم رو بده',
  'یا اباعبدالله، به دست‌های بریده عباس قسم گره از کارم باز کن'
];

export const LandingView: React.FC<LandingViewProps> = ({
  onSubmitOrder,
  onOpenAdmin,
  donationInfo
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amal, setAmal] = useState('');
  const [amalPlaceholder, setAmalPlaceholder] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [amountInputStr, setAmountInputStr] = useState<string>('');
  const [isAmountTouched, setIsAmountTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isAmountTooLow = isAmountTouched && (selectedAmount < MIN_AMOUNT_TOMAN);

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAmountTouched(true);
    const raw = e.target.value;
    const num = parseTomanAmount(raw);
    setSelectedAmount(num);
    if (!raw.trim()) {
      setAmountInputStr('');
    } else if (num === 0) {
      setAmountInputStr(raw);
    } else {
      setAmountInputStr(formatNumberWithCommas(num));
    }
  };

  const handleSelectSuggestedAmount = (val: number) => {
    setIsAmountTouched(true);
    setSelectedAmount(val);
    setAmountInputStr(formatNumberWithCommas(val));
    setErrorMessage('');
  };

  // Typewriter effect for amal placeholder
  useEffect(() => {
    let currentIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      const fullText = SUGGESTED_AMALS[currentIndex];
      if (isDeleting) {
        currentText = fullText.substring(0, currentText.length - 1);
      } else {
        currentText = fullText.substring(0, currentText.length + 1);
      }
      setAmalPlaceholder('مثال: ' + currentText + (currentText.length < fullText.length || !isDeleting ? '|' : ''));

      let typeSpeed = isDeleting ? 30 : 70;

      if (!isDeleting && currentText === fullText) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && currentText === '') {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % SUGGESTED_AMALS.length;
        typeSpeed = 300;
      }
      timeout = setTimeout(type, typeSpeed);
    };

    timeout = setTimeout(type, 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAmal = amal.trim();

    if (!cleanName) {
      setErrorMessage('لطفاً نام و نام خانوادگی خود را وارد فرمایید.');
      return;
    }

    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMessage('لطفاً شماره همراه معتبر ۱۱ رقمی وارد نمایید (مثال: ۰۹۱۲۳۴۵۶۷۸۹).');
      return;
    }

    if (!cleanAmal) {
      setErrorMessage('لطفاً عمل یا دعای درخواستی خود را بنویسید.');
      return;
    }

    if (!selectedAmount || selectedAmount < MIN_AMOUNT_TOMAN) {
      setIsAmountTouched(true);
      setErrorMessage('حداقل مبلغ مشارکت ۵۰ هزار تومان است.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmitOrder({
        name: cleanName,
        phone: cleanPhone,
        amal: cleanAmal,
        niyyat: cleanAmal,
        amount: selectedAmount
      });

      if (!res.success) {
        setErrorMessage(res.message || 'خطا در اتصال به درگاه پرداخت.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('خطای غیرمنتظره در ثبت سفارش. لطفاً دوباره تلاش فرمایید.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col justify-between min-h-[95vh] py-6 px-4">
      <form
        onSubmit={handleSubmit}
        className="my-auto bg-slate-900 rounded-3xl shadow-xl shadow-amber-900/10 border border-slate-800 overflow-hidden transition-all"
      >
        {/* ۱. هدر بنر و ثبت سریع عمل درخواستی / حاجت (با ارتفاع بیشتر و نمایش چشم‌نواز تصویر حرم) */}
        <div className="relative w-full h-[450px] sm:h-[480px] bg-slate-950 overflow-hidden">
          <img
            src={headerImage}
            alt="حرم مطهر کربلا"
            className="w-full h-full object-cover object-top brightness-95 transition-transform duration-700 hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('header.jpg')) {
                target.src = '/header.jpg';
              } else if (!target.src.includes('header-current')) {
                target.src = '/header-current.png';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/35 to-transparent pointer-events-none" />

          {/* The Core Intent Call + Prominent Hajat Input Box */}
          <div className="absolute inset-0 flex flex-col items-center justify-end p-5 pb-6 text-center z-10">
            <span className="text-sm sm:text-base font-semibold text-amber-200/95 drop-shadow-md tracking-wide mb-1">
              از امام حسین (ع)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug text-white drop-shadow-lg mb-3.5">
              حاجت بخواه
            </h1>

            {/* Hajat / Requested Deed Input Box right under the title */}
            <div className="w-full max-w-sm sm:max-w-md px-2">
              <div className="relative flex items-start gap-2.5 bg-slate-950/90 backdrop-blur-md border-2 border-amber-500/70 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-500/30 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all px-3.5 py-2.5">
                <PenLine className="w-4 h-4 text-amber-400 shrink-0 pointer-events-none mt-1" />
                <textarea
                  id="field-amal"
                  rows={2}
                  required
                  disabled={isSubmitting}
                  value={amal}
                  onChange={(e) => setAmal(e.target.value)}
                  placeholder={amalPlaceholder || 'مثال: یا حسین، به علی‌اصغرت قسم شفای بیمارم رو بده'}
                  className="w-full bg-transparent text-right text-xs sm:text-sm text-slate-100 placeholder:text-slate-300/80 focus:outline-none font-medium resize-none leading-relaxed h-[48px] sm:h-[52px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* بدنه فرم: تفکیک شده، جادار و منظم در قالب همان ساختار یکپارچه اصلی */}
        <div className="p-6">
          {/* پیام آشنایی و تبیین نیت خیر اعزام زائر قبل از مشخصات (طراحی آرام، اولویت ثانویه و بدون جلب توجه افراطی) */}
          <div className="bg-[#0d1726]/80 border border-[#1e2e48]/80 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 shadow-sm mb-[44px]">
            <HeartHandshake className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-slate-400 font-normal text-right">
              با مشارکت شما در تأمین هزینه اعزام زائران، دعا و حاجت درخواستی شما در حرم امام حسین (ع) توسط « خانه زیارت » انجام میشود
            </p>
          </div>

          {/* ۲. بخش مشخصات فردی و تماس */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-200">مشخصات شما</span>
            </div>

            <div>
              <label htmlFor="field-name" className="block text-xs font-semibold text-slate-400 mb-1.5">
                نام و نام خانوادگی
              </label>
              <input
                id="field-name"
                type="text"
                autoComplete="name"
                required
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: علیرضا علوی‌نژاد"
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950/50 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:bg-slate-900 transition-all"
              />
            </div>

            <div>
              <label htmlFor="field-phone" className="block text-xs font-semibold text-slate-400 mb-1.5">
                شماره همراه
              </label>
              <input
                id="field-phone"
                type="tel"
                autoComplete="tel"
                required
                disabled={isSubmitting}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950/50 text-sm text-right text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:bg-slate-900 transition-all font-mono"
              />
            </div>
          </div>

          {/* ۳. بخش میزان مشارکت در اعزام زائر و پرداخت با فاصله متوازن ۴۴ پیکسل */}
          <div className="space-y-4 mt-[44px]">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-200">میزان مشارکت شما در اعزام زائر:</span>
            </div>

            {/* Custom Amount Input Box */}
            <div className="space-y-1.5">
              <div
                className={`flex items-center rounded-xl border transition-all px-3.5 py-3 ${
                  isAmountTooLow
                    ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50'
                    : 'border-slate-700 bg-slate-950/50 focus-within:ring-2 focus-within:ring-amber-500/60 focus-within:border-amber-500/80 focus-within:bg-slate-900'
                }`}
              >
                <input
                  id="field-amount"
                  type="text"
                  inputMode="numeric"
                  disabled={isSubmitting}
                  value={amountInputStr}
                  onChange={handleAmountInputChange}
                  placeholder="مبلغ دلخواه خود را بنویسید"
                  dir="rtl"
                  className={`w-full bg-transparent text-right text-base font-bold font-mono focus:outline-none placeholder:font-sans placeholder:text-xs placeholder:text-right placeholder:text-slate-500 ${
                    isAmountTooLow ? 'text-rose-200 placeholder:text-rose-400/60' : 'text-slate-100'
                  }`}
                />
                <span
                  className={`mr-2.5 shrink-0 text-xs font-bold select-none ${
                    isAmountTooLow ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  تومان
                </span>
              </div>

              {/* Minimum validation warning: Red box and message */}
              {isAmountTooLow && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold px-1 py-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>حداقل مبلغ ۵۰ هزار تومان است</span>
                </div>
              )}
            </div>

            {/* 3 Suggested Amount Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-medium block">
                یا انتخاب سریع از مبالغ پیشنهادی:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {SUGGESTED_AMOUNTS.map((item) => {
                  const isSelected = selectedAmount === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectSuggestedAmount(item.value)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer select-none text-center ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/50 shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              *تمامی مبالغ پرداختی، صرفاً جهت تأمین کمک‌هزینه اعزام زائران به کربلای معلی مصرف خواهد شد.
            </p>

            {/* Optional Card-to-Card Box (Only rendered if DONATION_CARD_NUMBER is configured on server) */}
            {donationInfo?.hasCard && donationInfo.cardNumber && (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>امکان واریز کارت به کارت:</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs text-slate-100 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span dir="ltr">{donationInfo.cardNumber}</span>
                  {donationInfo.cardHolder && (
                    <span className="text-[11px] font-sans text-slate-400">{donationInfo.cardHolder}</span>
                  )}
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Direct Redirection to Dedicated Payment Gateway per Section 7 */}
            <button
              type="submit"
              id="btn-submit-landing"
              disabled={isSubmitting || isAmountTooLow}
              className="w-full mt-2 py-3.5 px-4 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>در حال اتصال به درگاه پرداخت خانه زیارت...</span>
                </span>
              ) : isAmountTooLow ? (
                <span>حداقل مبلغ ۵۰ هزار تومان است</span>
              ) : selectedAmount >= MIN_AMOUNT_TOMAN ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>پرداخت {formatToman(selectedAmount)} و ثبت نیابت</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>پرداخت و ثبت نیابت</span>
                </>
              )}
            </button>

            <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-0.5">
              <Lock className="w-3 h-3 text-slate-600" />
              <span>اتصال مستقیم و امن به درگاه اختصاصی خانه زیارت</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
