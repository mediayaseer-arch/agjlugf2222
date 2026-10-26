import React from 'react';
import { Wifi, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

export default function LinkServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader showBack backTo="/select-watch" title="الخطوة 3: خدمة ربط الساعة" />

      <main className="flex-1 py-8 px-4 max-w-md mx-auto w-full flex flex-col justify-between">
        <div className="space-y-6 text-center">
          {/* Service Explanatory Text */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
            <p className="text-gray-800 text-sm sm:text-base leading-relaxed font-semibold">
              يقدّم الموقع خدمة ربط الساعة الذكية بالبطاقة البنكية، بما يتيح للعملاء إجراء عمليات الدفع إلكترونياً بسهولة وأمان، وفق أعلى معايير الحماية المعتمدة، ودون الحاجة إلى استخدام البطاقة البنكية أو الهاتف المحمول.
            </p>
          </div>

          {/* Central Animated Pulse Radar Showcase */}
          <div className="relative py-6 flex items-center justify-center">
            {/* Pulse concentric rings */}
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[#e6f4f0] to-[#f4f7f5] border border-[#004838]/20 flex items-center justify-center shadow-inner relative">
              <div className="w-36 h-36 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 relative">
                {/* Center Radio Wave Icon */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#004838] text-[#e8c679] flex items-center justify-center shadow-lg shadow-[#004838]/30">
                    <Wifi className="w-8 h-8 rotate-90" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 mt-2">NFC Token Ready</span>
                </div>
              </div>

              {/* Pulsing beacon circles */}
              <div className="absolute inset-0 rounded-full border-2 border-[#004838]/25 animate-ping opacity-30 pointer-events-none" />
            </div>
          </div>

          {/* Prompt text matching screenshot */}
          <div className="px-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
              يرجى المتابعة لتأكيد هويتك المصرفية وربط البطاقة بالساعة الذكية
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              سيتم نقلك لتسجيل الدخول الآمن لحسابك عبر بوابة البنك الأهلي
            </p>
          </div>

          {/* Continue Button */}
          <div className="pt-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] hover:to-[#a7731a] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#d4a343]/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>متابعة لتسجيل الدخول</span>
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
