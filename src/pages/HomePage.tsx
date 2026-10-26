import React from 'react';
import {
  Smartphone,
  ShieldCheck,
  Settings,
  ChevronLeft,
  CreditCard,
  Watch,
  Lock,
  Wifi,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { FormState, MAIN_HERO_IMG } from '../types';

const WATCH_FINISHES = [
  {
    id: 'rose-gold',
    name: 'ذهبي وردي ملكي',
    en: 'Rose Gold Titanium',
    swatch: '#c68e77',
    ring: 'ring-[#c68e77]/40'
  },
  {
    id: 'midnight',
    name: 'أسود منتصف الليل',
    en: 'Midnight Obsidian',
    swatch: '#18181b',
    ring: 'ring-zinc-800/40'
  },
  {
    id: 'silver',
    name: 'فضي بلاتينيوم',
    en: 'Platinum Silver',
    swatch: '#cbd5e1',
    ring: 'ring-slate-400/40'
  }
];

export default function HomePage({
  formState,
  setFormState
}: {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const navigate = useNavigate();

  const selectedFinish =
    WATCH_FINISHES.find((f) => f.id === formState.watchColor) || WATCH_FINISHES[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f5] text-slate-900">
      <AppHeader />

      {/* Hero Section — Luxury Omani Ahli Bank Aesthetic */}
      <section className="relative overflow-hidden pt-6 pb-8 px-5 bg-gradient-to-b from-[#01261d] via-[#043d30] to-[#f4f7f5]">
        {/* Ambient warm gold & deep emerald illumination */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#004838]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-28 -left-24 w-72 h-72 bg-[#d4a343]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md mx-auto relative z-10">
          {/* Editorial Unboxed Kicker */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-wide text-[#e8c679] mb-3">
            <span>البنك الأهلي العماني</span>
            <span aria-hidden="true">·</span>
            <span>الخدمات المصرفية الرقمية</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-white">ahli bank</span>
          </div>

          {/* Hero space */}
          <div className="mb-4"></div>

          {/* Main Hero Artwork Frame */}
          <div
            onClick={() => navigate('/form')}
            className="relative mx-auto rounded-[28px] overflow-hidden shadow-2xl border border-[#d4a343]/30 bg-[#011c15] mb-5 cursor-pointer group transition-transform duration-200 hover:scale-[1.01]"
          >
            <img
              src={MAIN_HERO_IMG}
              alt="ساعة البنك الأهلي العماني الذكية - ahli bank"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain block"
            />
          </div>

          {/* Primary & Secondary Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center mb-6">
            <button
              onClick={() => navigate('/form')}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] hover:to-[#a7731a] text-white font-bold text-base rounded-2xl shadow-xl shadow-[#d4a343]/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Watch className="w-5 h-5 text-[#fef3c7]" />
              <span>أحصل على ساعتك الآن</span>
            </button>
            <button
              onClick={() => navigate('/form')}
              className="py-4 px-5 bg-[#004838] hover:bg-[#00382b] text-white border border-[#d4a343]/40 font-bold text-sm rounded-2xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Smartphone className="w-4 h-4 text-[#e8c679]" />
              <span>ربط Apple Pay</span>
              <ChevronLeft className="w-4 h-4 text-emerald-200" />
            </button>
          </div>

          {/* Quantitative Banking Proof Strip */}
          <div className="bg-white rounded-2xl border border-emerald-900/10 shadow-sm p-4 grid grid-cols-3 divide-x divide-x-reverse divide-emerald-900/10 text-center">
            <div className="px-2">
              <p className="text-sm sm:text-base font-black text-[#004838] font-mono tabular-nums">0.000 ر.ع</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">إصدار مجاني للعملاء</p>
            </div>
            <div className="px-2">
              <p className="text-sm sm:text-base font-black text-slate-900 font-mono tabular-nums">100%</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">أمان وموثوقية مشفرة</p>
            </div>
            <div className="px-2">
              <p className="text-sm sm:text-base font-black text-[#c8922c] font-mono tabular-nums">&lt; 0.5s</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">استجابة الدفع باللمس</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Finish Selector Bar */}
      <section className="px-5 pt-2 pb-6 max-w-md mx-auto w-full">
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">الإصدارات الفاخرة المتوفرة</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                اختر اللون المفضل لمعصمك قبل المتابعة ({selectedFinish.name})
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/select-watch')}
              className="text-xs font-bold text-[#004838] hover:text-[#075945] flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>معاينة ثلاثية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {WATCH_FINISHES.map((finish) => {
              const isSelected = formState.watchColor === finish.id;
              return (
                <button
                  key={finish.id}
                  type="button"
                  onClick={() => setFormState({ ...formState, watchColor: finish.id })}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#004838] bg-[#e6f4f0]/70 shadow-xs'
                      : 'border-stone-200/80 bg-[#fbfaf9] hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span
                      className={`w-6 h-6 rounded-full border border-white shadow-sm ring-2 ${finish.ring}`}
                      style={{ backgroundColor: finish.swatch }}
                    />
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-[#004838] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">{finish.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{finish.en}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Editorial Step-by-Step Participation Section */}
      <section className="py-4 px-5 max-w-md mx-auto w-full">
        <div className="flex items-baseline justify-between mb-4 px-1">
          <div>
            <h2 className="text-lg font-black text-slate-900">خطوات الطلب والتفعيل</h2>
            <p className="text-xs text-slate-500 mt-0.5">أربع خطوات سريعة لاستلام ساعتك وربطها بحسابك</p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">01 — 04</span>
        </div>

        <div className="space-y-3">
          {[
            {
              num: '01',
              icon: Smartphone,
              title: 'تسجيل بيانات العميل',
              desc: 'الاسم الكامل ورقم الهاتف المسجل لدى البنك الأهلي',
              path: '/form'
            },
            {
              num: '02',
              icon: Watch,
              title: 'تخصيص الساعة الذكية',
              desc: 'اختيار لون الهيكل، المقاس (41mm / 45mm)، ونوع السوار',
              path: '/select-watch'
            },
            {
              num: '03',
              icon: CreditCard,
              title: 'الربط المشفّر للبطاقة',
              desc: 'تفعيل شريحة الدفع اللاتلامسي عبر بوابة البنك الأهلي الآمنة',
              path: '/link-service'
            },
            {
              num: '04',
              icon: ShieldCheck,
              title: 'التصديق الفوري وإتمام الطلب',
              desc: 'تأكيد رمز الأمان لإصدار وشحن ساعتك مجاناً خلال 48 ساعة',
              path: '/login'
            }
          ].map((step) => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.num}
                onClick={() => navigate(step.path)}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-[#004838]/30 transition-all flex items-center justify-between gap-4 group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#f4f7f5] border border-stone-200/60 text-slate-700 flex items-center justify-center group-hover:bg-[#e6f4f0] group-hover:text-[#004838] group-hover:border-[#004838]/20 transition-colors shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#004838] tabular-nums">
                        {step.num}.
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-[#004838] transition-colors">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>

                <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-[#004838] group-hover:-translate-x-0.5 transition-all shrink-0" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Banking Security & Assurance Section */}
      <section className="py-6 px-5 max-w-md mx-auto w-full">
        <div className="bg-gradient-to-br from-[#01261d] to-[#043d30] rounded-3xl p-5 text-white shadow-lg border border-[#d4a343]/20">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-semibold text-[#e8c679]">حماية مصرفية متكاملة</p>
              <h3 className="text-base font-bold text-white mt-0.5">
                أمان بمعايير البنك المركزي العُماني
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-[#fef3c7]" />
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-stone-300 leading-relaxed mb-5">
            <p>
              تعتمد <span className="text-[#e8c679] font-bold">ساعة البنك الأهلي الذكية</span> على تقنية الترميز الرقمي المعتمدة دولياً، حيث لا يتم تخزين أو مشاركة رقم بطاقتك البنكية الفعلي أثناء الدفع.
            </p>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-300">
              <span>ضمان شامل لمدة سنتين</span>
              <span aria-hidden="true">·</span>
              <span>إيقاف فوري عبر التطبيق</span>
              <span aria-hidden="true">·</span>
              <span>شحن مجاني</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/form')}
            className="w-full py-3.5 bg-gradient-to-r from-[#d4a343] via-[#c8922c] to-[#b88022] hover:from-[#c8922c] text-white font-bold text-sm rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>ابدأ طلب ساعتك المجانية الآن</span>
            <ChevronLeft className="w-4 h-4 text-[#fef3c7]" />
          </button>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
