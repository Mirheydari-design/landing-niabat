import { useState, useEffect } from 'react';
import { OrderItem, DonationCardInfo } from './types';
import { LandingView } from './components/LandingView';
import { ReceiptView } from './components/ReceiptView';
import { FailureView } from './components/FailureView';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [screen, setScreen] = useState<'landing' | 'settling' | 'receipt' | 'failure' | 'admin'>('landing');
  const [activeOrder, setActiveOrder] = useState<OrderItem | null>(null);
  const [failureInfo, setFailureInfo] = useState<{
    outcome: string;
    reportedAmount?: number;
    expectedAmount?: number;
  }>({ outcome: 'failed' });
  const [donationInfo, setDonationInfo] = useState<DonationCardInfo | null>(null);

  const baseUrl = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    // 1. Record page view on backend
    fetch(`${baseUrl}api/view`).catch(() => {});

    // 2. Fetch optional donation card information
    fetch(`${baseUrl}api/donation-info`)
      .then((res) => res.json())
      .then((info) => {
        if (info && info.hasCard) setDonationInfo(info);
      })
      .catch(() => {});

    // 3. Check for gateway return parameters per Section 7.3
    const params = new URLSearchParams(window.location.search);
    const entryId = params.get('entryid') || params.get('entryId');
    const status = params.get('status');

    const checkIsAdmin = () => {
      const p = new URLSearchParams(window.location.search);
      return (
        p.get('admin') === 'true' ||
        window.location.pathname.endsWith('/admin') ||
        window.location.pathname.includes('/admin') ||
        window.location.hash === '#admin' ||
        window.location.hash === '#/admin'
      );
    };

    if (checkIsAdmin()) {
      setScreen('admin');
      return;
    }

    const onHashChange = () => {
      if (checkIsAdmin()) {
        setScreen('admin');
      }
    };
    window.addEventListener('hashchange', onHashChange);

    if (entryId && status) {
      setScreen('settling');
      const payload = Object.fromEntries(params.entries());

      fetch(`${baseUrl}api/orders/${entryId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then((res) => res.json())
        .then(({ outcome, order, reportedAmount, expectedAmount }) => {
          if (outcome === 'paid' || outcome === 'already_paid') {
            setActiveOrder(order);
            setScreen('receipt');
          } else {
            setFailureInfo({ outcome: outcome || 'failed', reportedAmount, expectedAmount });
            setScreen('failure');
          }
        })
        .catch((err) => {
          console.error('Error settling payment callback:', err);
          setFailureInfo({ outcome: 'failed' });
          setScreen('failure');
        })
        .finally(() => {
          // Clean the query string from URL per Section 7.3
          window.history.replaceState({}, '', window.location.pathname);
        });
    }

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const handleOrderSubmit = async (data: {
    name: string;
    phone: string;
    amal: string;
    niyyat: string;
    amount: number;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const callbackUrl = window.location.origin + window.location.pathname;

      const res = await fetch(`${baseUrl}api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          callbackUrl
        })
      });

      const result = await res.json();

      if (res.ok && result.success && result.gatewayUrl) {
        // Redirect browser to the official Ziarat Home payment gateway per Section 7
        window.location.href = result.gatewayUrl;
        return { success: true };
      } else {
        return {
          success: false,
          message: result.message || 'خطا در برقراری ارتباط با درگاه پرداخت.'
        };
      }
    } catch {
      return {
        success: false,
        message: 'خطای شبکه در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی فرمایید.'
      };
    }
  };

  const handleBackToLanding = () => {
    setActiveOrder(null);
    setScreen('landing');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-100" dir="rtl">
      {screen === 'settling' ? (
        <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center min-h-[90vh] p-6 text-center space-y-4">
          <div className="w-14 h-14 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-200">در حال استعلام و ثبت نهایی پرداخت...</h2>
          <p className="text-xs text-slate-400">لطفاً چند لحظه شکیبا باشید.</p>
        </div>
      ) : screen === 'receipt' && activeOrder ? (
        <ReceiptView
          item={activeOrder}
          onBackToLanding={handleBackToLanding}
        />
      ) : screen === 'failure' ? (
        <FailureView
          outcome={failureInfo.outcome}
          reportedAmount={failureInfo.reportedAmount}
          expectedAmount={failureInfo.expectedAmount}
          onRetry={handleBackToLanding}
        />
      ) : screen === 'admin' ? (
        <AdminPanel
          onBack={handleBackToLanding}
        />
      ) : (
        <LandingView
          onSubmitOrder={handleOrderSubmit}
          onOpenAdmin={() => setScreen('admin')}
          donationInfo={donationInfo}
        />
      )}
    </div>
  );
}
