import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { adminLoginApi } from '../api';
import { LOGO_SRC } from '../types';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@bankmuscat.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminLoginApi(email, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f6f9] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-200 p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-black px-5 py-2.5 rounded-2xl mb-3 flex items-center justify-center shadow-md border border-neutral-800">
            <img
              src={LOGO_SRC}
              alt="البنك الأهلي - ahlibank"
              className="h-9 object-contain"
            />
          </div>
          <h1 className="text-lg font-black text-gray-900">لوحة التحكم - Masqat Pay</h1>
          <p className="text-xs text-gray-500 mt-1">تسجيل الدخول لإدارة الطلبات والموافقات المباشرة</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-[#004838] outline-none"
                required
              />
              <Mail className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-[#004838] outline-none"
                required
              />
              <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#004838] hover:bg-[#00382b] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-[#e8c679]" />
            <span>{loading ? 'جارِ الدخول...' : 'دخول للوحة التحكم'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
