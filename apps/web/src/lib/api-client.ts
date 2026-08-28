const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

type AuthScope = 'tenant' | 'system';
const refreshing: Partial<Record<AuthScope, Promise<void>>> = {};
let csrfBootstrapping: Promise<void> | null = null;
const sessionEstablished: Record<AuthScope, boolean> = { tenant: false, system: false };

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Access and refresh tokens are intentionally cookie-based in the browser.
// These no-op exports remain only for compatibility with older callers.
export function setAccessToken(_token: string | null) {}
export function getAccessToken() { return null; }

export function setSessionEstablished(value: boolean, scope: AuthScope = 'tenant') {
  sessionEstablished[scope] = value;
}

export function isSessionEstablished(scope: AuthScope = 'tenant') {
  return sessionEstablished[scope];
}

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
      if (!res.ok || !csrfToken()) {
        throw new ApiError('We could not prepare the secure request. Please refresh the page and try again.', res.status || 500, 'CSRF_INIT_FAILED');
      }
    })
    .finally(() => { csrfBootstrapping = null; });
  return csrfBootstrapping;
}

function isMutating(method: string | undefined) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method ?? 'GET').toUpperCase());
}

async function expireSession(scope: AuthScope) {
  sessionEstablished[scope] = false;
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(scope === 'system' ? 'itam_system_refresh_token' : 'itam_refresh_token');
  sessionStorage.removeItem(scope === 'system' ? 'itam_system_access_token' : 'itam_access_token');
  const loginPath = scope === 'system' ? '/system/login' : '/login';
  if (!window.location.pathname.startsWith(loginPath) && !(scope === 'tenant' && window.location.pathname.startsWith('/system/'))) {
    window.location.href = loginPath;
  }
}

export async function refreshSession(scope: AuthScope = 'tenant') {
  if (refreshing[scope]) return refreshing[scope];
  refreshing[scope] = (async () => {
    await ensureCsrfToken();
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': scope, 'X-CSRF-Token': csrfToken()! },
      credentials: 'include',
    });
    if (!res.ok) {
      await expireSession(scope);
      throw new ApiError(scope === 'system' ? 'Your System Admin session has ended. Please sign in again.' : 'Your session has ended. Please sign in again.', res.status || 401, 'SESSION_EXPIRED');
    }
    sessionEstablished[scope] = true;
  })().finally(() => { delete refreshing[scope]; });
  return refreshing[scope];
}

export async function bootstrapSession(scope: AuthScope = 'tenant') {
  if (typeof window === 'undefined') return null;
  const headers = { 'X-Auth-Scope': scope };
  const session = await fetch(`${API_BASE}/auth/session`, { method: 'GET', headers, credentials: 'include' });
  if (session.ok) {
    const data = await session.json().catch(() => null);
    if (data?.authenticated === true && data?.accountType === (scope === 'system' ? 'SYSTEM' : 'TENANT')) {
      sessionEstablished[scope] = true;
      return data;
    }
  }

  try {
    await refreshSession(scope);
  } catch {
    return null;
  }

  const retried = await fetch(`${API_BASE}/auth/session`, { method: 'GET', headers, credentials: 'include' });
  if (!retried.ok) {
    sessionEstablished[scope] = false;
    return null;
  }
  const data = await retried.json().catch(() => null);
  const expected = scope === 'system' ? 'SYSTEM' : 'TENANT';
  if (data?.authenticated === true && data?.accountType === expected) {
    sessionEstablished[scope] = true;
    return data;
  }
  sessionEstablished[scope] = false;
  return null;
}

function shouldRefreshOn401(path: string, scope: AuthScope) {
  return sessionEstablished[scope] && path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/system/login';
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

function normalizeServerMessage(body: any): string {
  if (!body) return '';
  if (typeof body.message === 'string') return body.message.trim();
  if (Array.isArray(body.message)) return body.message.filter((item: unknown) => typeof item === 'string').join(' ').trim();
  if (typeof body.error?.message === 'string') return body.error.message.trim();
  return '';
}

function userFriendlyMessage(status: number, path: string, body: any): { message: string; code?: string } {
  const raw = normalizeServerMessage(body).toLowerCase();
  const endpoint = path.split('?')[0];

  if (raw.includes('csrf') || raw.includes('security token')) return { message: 'Your secure session needs to be refreshed. Please try again.', code: 'CSRF_INVALID' };
  if (raw.includes('account temporarily locked') || raw.includes('temporarily locked')) return { message: 'Your account is temporarily locked after several unsuccessful sign-in attempts. Please try again later.', code: 'ACCOUNT_LOCKED' };
  if (raw.includes('invalid email or password')) return { message: 'The email address or password is incorrect.', code: 'INVALID_CREDENTIALS' };
  if (raw.includes('invalid system administrator credentials')) return { message: 'The system administrator email or password is incorrect.', code: 'INVALID_SYSTEM_CREDENTIALS' };
  if (raw.includes('account is inactive') || raw.includes('inactive')) return { message: 'This account is inactive. Please contact your administrator.', code: 'ACCOUNT_INACTIVE' };
  if (raw.includes('tenant is suspended') || raw.includes('tenant account is unavailable')) return { message: 'This organization is currently unavailable. Please contact your system administrator.', code: 'TENANT_UNAVAILABLE' };
  if (raw.includes('tenant is archived')) return { message: 'This organization is archived and cannot be accessed.', code: 'TENANT_ARCHIVED' };
  if (raw.includes('session is no longer valid') || raw.includes('session expired') || raw.includes('missing access token') || raw.includes('invalid or expired access token')) return { message: 'Your session has expired. Please sign in again.', code: 'SESSION_EXPIRED' };
  if (raw.includes('you cannot modify your own roles')) return { message: 'You cannot change your own access from here. Ask another administrator to make this change.', code: 'SELF_ROLE_CHANGE_BLOCKED' };
  if (raw.includes('you cannot modify your own admin level')) return { message: 'You cannot change your own administrator level. Ask another administrator to make this change.', code: 'SELF_ADMIN_LEVEL_CHANGE_BLOCKED' };
  if (raw.includes('last active tenant administrator') || raw.includes('last tenant admin')) return { message: 'At least one active Tenant Administrator must remain for this organization.', code: 'LAST_ADMIN_PROTECTED' };
  if (raw.includes('role belongs to a different company') || raw.includes('different company')) return { message: 'That access option belongs to a different company and cannot be assigned here.', code: 'COMPANY_SCOPE_MISMATCH' };
  if (raw.includes('one or more roles are not available')) return { message: 'One or more selected roles are no longer available. Refresh the page and try again.', code: 'ROLE_NOT_AVAILABLE' };
  if (raw.includes('already assigned') || raw.includes('already exists') || raw.includes('duplicate')) return { message: 'This information already exists. Please choose a different value.', code: 'DUPLICATE' };
  if (raw.includes('not found')) return { message: 'The requested item could not be found. It may have been removed or is no longer available.', code: 'NOT_FOUND' };
  if (raw.includes('required') || raw.includes('validation') || raw.includes('must be') || raw.includes('invalid')) return { message: 'Please check the information you entered and try again.', code: 'VALIDATION_FAILED' };
  if (endpoint.includes('/assets/') && endpoint.endsWith('/assign')) return { message: 'We could not assign this asset. Please check the employee and asset details and try again.', code: 'ASSET_ASSIGN_FAILED' };
  if (endpoint === '/assets') return { message: 'We could not save the asset. Please check the details and try again.', code: 'ASSET_SAVE_FAILED' };
  if (endpoint.includes('/users') && endpoint.endsWith('/roles')) return { message: 'We could not update access for this user. Please refresh the page and try again.', code: 'USER_ACCESS_UPDATE_FAILED' };
  if (status === 400) return { message: 'Please check the information entered and try again.', code: 'BAD_REQUEST' };
  if (status === 401) return { message: 'Your session has expired. Please sign in again.', code: 'UNAUTHORIZED' };
  if (status === 403) return { message: 'You do not have permission to perform this action.', code: 'FORBIDDEN' };
  if (status === 404) return { message: 'We could not find what you were looking for.', code: 'NOT_FOUND' };
  if (status === 409) return { message: 'This change conflicts with existing information. Please review and try again.', code: 'CONFLICT' };
  if (status === 413) return { message: 'The selected file is too large. Please choose a smaller file.', code: 'PAYLOAD_TOO_LARGE' };
  if (status === 429) return { message: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMITED' };
  if (status >= 500) return { message: 'Something went wrong on our side. Please try again. If the problem continues, contact your administrator.', code: 'SERVER_ERROR' };
  return { message: 'We could not complete that request. Please try again.', code: 'REQUEST_FAILED' };
}

async function parseErrorResponse(res: Response, path: string): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  const mapped = userFriendlyMessage(res.status, path, body);
  return new ApiError(mapped.message, res.status, mapped.code, body);
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true) {
  const headers = await buildHeaders(path, options);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (res.status === 401 && retry && shouldRefreshOn401(path, 'tenant')) {
    await refreshSession('tenant');
    return apiFetch(path, options, false);
  }
  if (!res.ok) throw await parseErrorResponse(res, path);
  return res.json();
}

export async function downloadFile(path: string, retry = true, options: RequestInit = {}) {
  const headers = await buildHeaders(path, options);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (res.status === 401 && retry && shouldRefreshOn401(path, 'tenant')) {
    await refreshSession('tenant');
    return downloadFile(path, false, options);
  }
  if (!res.ok) throw await parseErrorResponse(res, path);
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
  sessionEstablished.tenant = true;
  return result;
}

export async function systemLogin(email: string, password: string) {
  const result = await apiFetch('/auth/system/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  sessionEstablished.system = true;
  return result;
}

export async function logout(scope: AuthScope = 'tenant') {
  if (typeof window === 'undefined') return;
  try {
    await ensureCsrfToken();
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': scope, 'X-CSRF-Token': csrfToken()! }, credentials: 'include' });
  } catch {}
  await expireSession(scope);
}
