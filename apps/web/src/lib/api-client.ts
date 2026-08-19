const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';
let refreshing: Promise<void> | null = null;
let csrfBootstrapping: Promise<void> | null = null;
let sessionEstablished = false;

export function setAccessToken(_token: string | null) {}
export function getAccessToken() { return null; }
export function setSessionEstablished(value: boolean) { sessionEstablished = value; }
export function isSessionEstablished() { return sessionEstablished; }

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((entry) => entry.startsWith('assethub_csrf='));
  return match ? decodeURIComponent(match.slice('assethub_csrf='.length)) : undefined;
}

async function ensureCsrfToken(force = false) {
  if (!force && csrfToken()) return;
  if (csrfBootstrapping) return csrfBootstrapping;
  csrfBootstrapping = fetch(`${API_BASE}/auth/csrf`, { method: 'GET', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok || !csrfToken()) throw new Error('Unable to initialize CSRF protection');
    })
    .finally(() => { csrfBootstrapping = null; });
  return csrfBootstrapping;
}

function isMutating(method: string | undefined) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method ?? 'GET').toUpperCase());
}

async function expireTenantSession() {
  sessionEstablished = false;
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('itam_refresh_token');
  sessionStorage.removeItem('itam_access_token');
  if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/system/')) window.location.href = '/login';
}

async function refreshSession() {
  if (refreshing) return refreshing;
  await ensureCsrfToken();
  refreshing = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken()! },
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      await expireTenantSession();
      throw new Error('Session expired');
    }
    sessionEstablished = true;
  }).finally(() => { refreshing = null; });
  return refreshing;
}

function shouldRefreshOn401(path: string) {
  return sessionEstablished && path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/system/login';
}

async function buildHeaders(path: string, options: RequestInit) {
  const headers = new Headers(options.headers);
  if (options.body instanceof FormData) headers.delete('Content-Type');
  else if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (isMutating(options.method)) {
    await ensureCsrfToken(path === '/auth/change-password');
    const token = csrfToken();
    if (token && !headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', token);
  }
  return headers;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true) {
  const headers = await buildHeaders(path, options);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (res.status === 401 && retry && shouldRefreshOn401(path)) {
    await refreshSession();
    return apiFetch(path, options, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function downloadFile(path: string, retry = true, options: RequestInit = {}) {
  const headers = await buildHeaders(path, options);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (res.status === 401 && retry && sessionEstablished && path !== '/auth/refresh') {
    await refreshSession();
    return downloadFile(path, false, options);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(message ?? `Request failed: ${res.status}`);
  }
  return { blob: await res.blob(), filename: getFilename(res.headers.get('content-disposition')) };
}

function getFilename(contentDisposition: string | null) {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? 'download';
}

function currentTenantSlug(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return undefined;
  const root = (process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (root && hostname.endsWith(`.${root}`)) {
    const prefix = hostname.slice(0, -(`.${root}`).length);
    if (prefix && !prefix.includes('.')) return prefix;
  }
  return undefined;
}

export async function login(email: string, password: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const slug = currentTenantSlug();
  if (slug) headers.set('X-Tenant-Slug', slug);
  const result = await apiFetch('/auth/login', { method: 'POST', headers, body: JSON.stringify({ email, password }) });
  sessionEstablished = true;
  return result;
}

export async function systemLogin(email: string, password: string) {
  const result = await apiFetch('/auth/system/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  sessionEstablished = true;
  return result;
}

export async function logout() {
  if (typeof window === 'undefined') return;
  try {
    await ensureCsrfToken();
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': 'tenant', 'X-CSRF-Token': csrfToken()! }, credentials: 'include' });
  } catch {}
  await expireTenantSession();
}
