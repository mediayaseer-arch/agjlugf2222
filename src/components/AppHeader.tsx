import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { LOGO_SRC } from '../types';

export default function AppHeader({
  showBack = false,
  backTo = '/',
  title = ''
}: {
  showBack?: boolean;
  backTo?: string;
  title?: string;
}) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-black backdrop-blur-md border-b border-neutral-900 px-4 py-3 shadow-md">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="w-11 flex items-center justify-start">
          {showBack && (
            <button
              onClick={() => navigate(backTo)}
              aria-label="العودة"
              className="p-2 -mr-2 text-white hover:text-white hover:bg-neutral-800 rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center justify-center flex-1">
          <Link to="/" className="inline-flex items-center justify-center hover:opacity-90 transition-opacity">
            <img
              src={LOGO_SRC}
              alt="البنك الأهلي - ahlibank"
              referrerPolicy="no-referrer"
              className="h-8 md:h-9 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </Link>
          {title && <span className="text-[11px] font-medium text-neutral-300 mt-1">{title}</span>}
        </div>

        <div className="w-11 flex items-center justify-end">
          <span className="text-xs font-semibold text-neutral-300 tracking-wide whitespace-nowrap shrink-0">
            عربي
          </span>
        </div>
      </div>
    </header>
  );
}
