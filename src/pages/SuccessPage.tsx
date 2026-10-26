import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { FormState } from '../types';

export default function SuccessPage({ formState }: { formState: FormState }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader title="تم تأكيد الطلب بنجاح" />

      <main className="flex-1 py-8 px-4 max-w-md mx-auto w-full flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-gray-900">تهانينا! تم تأكيد طلبك</h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
            تم تسجيل طلب ساعتك الذكية وتفعيل ميزة الدفع الذكي على حسابك لدى البنك الأهلي بنجاح.
          </p>

          {/* Receipt Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-right space-y-2">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500">رقم المرجع:</span>
              <span className="font-mono font-bold text-gray-800">AB-PAY-2026-98421</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500">اسم العميل:</span>
              <span className="font-bold text-gray-800">{formState.fullName || 'عميل البنك الأهلي المميز'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500">حالة التوصيل:</span>
              <span className="font-bold text-emerald-600">قيد التجهيز (خلال 48 ساعة)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">رسوم الخدمة:</span>
              <span className="font-bold text-[#004838]">مجاناً (0.000 ر.ع)</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] text-white font-bold rounded-2xl shadow-md shadow-[#d4a343]/20 cursor-pointer"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
