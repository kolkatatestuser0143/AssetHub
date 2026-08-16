const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';
let refreshing: Promise<void> | null = null;
export function setAccessToken(_token: string | null) {}
export function getAccessToken() { return null; }
async function refreshSession() { if (refreshing) return refreshing; refreshing = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': 'tenant' }, credentials: 'include' }).then((res) => { if (!res.ok) throw new Error('Session expired'); }).finally(() => { refreshing = null; }); return refreshing; }
function shouldRefreshOn401(path: string) { return path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/system/login'; }
function buildHeaders(options: RequestInit) { const headers = new Headers(options.headers); if (options.body instanceof FormData) headers.delete('Content-Type'); else if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json'); return headers; }
export async function apiFetch(path: string, options: RequestInit = {}, retry = true) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(options), credentials: 'include' }); if (res.status === 401 && retry && shouldRefreshOn401(path)) { await refreshSession(); return apiFetch(path, options, false); } if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message ?? `Request failed: ${res.status}`); } return res.json(); }
export async function downloadFile(path: string, retry = true, options: RequestInit = {}) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(options), credentials: 'include' }); if (res.status === 401 && retry && path !== '/auth/refresh') { await refreshSession(); return downloadFile(path, false, options); } if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message ?? `Request failed: ${res.status}`); } return { blob: await res.blob(), filename: getFilename(res.headers.get('content-disposition')) }; }
function getFilename(contentDisposition: string | null) { const match = contentDisposition?.match(/filename="([^"]+)"/i); return match?.[1] ?? 'download'; }
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
export async function login(email: string, password: string) { const headers = new Headers({ 'Content-Type': 'application/json' }); const slug = currentTenantSlug(); if (slug) headers.set('X-Tenant-Slug', slug); return apiFetch('/auth/login', { method: 'POST', headers, body: JSON.stringify({ email, password }) }); }
export async function systemLogin(email: string, password: string) { return apiFetch('/auth/system/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
export async function logout() { if (typeof window === 'undefined') return; try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': 'tenant' }, credentials: 'include' }); } catch { } sessionStorage.removeItem('itam_refresh_token'); sessionStorage.removeItem('itam_access_token'); }
