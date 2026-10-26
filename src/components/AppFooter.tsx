import React from 'react';
import { Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BANNER_BG } from '../types';

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      {/* Visual Building Banner */}
      <div className="relative w-full h-24 sm:h-28 bg-gradient-to-r from-[#01261d] via-[#043d30] to-[#01261d] overflow-hidden">
        {/* Background architectural image clipped cleanly */}
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url(${BANNER_BG})`, backgroundPosition: 'center bottom' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#011c15] via-[#01261d]/70 to-transparent" />

        <div className="relative h-full flex flex-col justify-center items-center text-center px-4 z-10">
          <p className="text-sm sm:text-base font-bold text-white tracking-wide">
            اكتشف <span className="text-[#e8c679]">عالماً يتعدى</span> الخدمات المصرفية
          </p>
          <p className="text-[11px] text-emerald-100/80 mt-0.5">
            حلول رقمية مبتكرة تصنع للحياة العصرية في سلطنة عُمان · البنك الأهلي
          </p>
        </div>
      </div>

      {/* Ahli Pay Subfooter Bar */}
      <div className="bg-[#011c15] text-gray-300 px-4 py-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 max-w-lg mx-auto border-t border-emerald-950">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#004838]/60 border border-[#d4a343]/50 flex items-center justify-center text-[#e8c679]">
            <Wifi className="w-3.5 h-3.5 rotate-90" />
          </div>
          <span className="font-bold text-white tracking-wide">ahli bank</span>
          <span className="text-emerald-800">|</span>
          <span className="text-[11px] text-emerald-200/80">دفع آمن بالمعصم</span>
        </div>

        <div className="text-[11px] text-gray-400 text-center sm:text-left">
          <Link to="/admin" className="hover:text-gray-300 transition-colors">
            © 2026
          </Link>{' '}
          البنك الأهلي العماني · تجربة تعريفية · صنع للحياة العُمانية
        </div>
      </div>
    </footer>
  );
}
