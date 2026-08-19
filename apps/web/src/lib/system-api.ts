const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';
let refreshing: Promise<void> | null = null;

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((entry) => entry.startsWith('assethub_csrf='));
  return match ? decodeURIComponent(match.slice('assethub_csrf='.length)) : undefined;
}

function headersFor(options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method ?? 'GET').toUpperCase())) {
    const token = csrfToken();
    if (token && !headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', token);
  }
  return headers;
}

function friendlySystemError(status: number, body: any): Error {
  const raw = typeof body?.message === 'string' ? body.message.toLowerCase() : '';
  if (raw.includes('csrf') || raw.includes('security token')) return new Error('Your secure session needs to be refreshed. Please try again.');
  if (raw.includes('invalid system administrator credentials') || raw.includes('invalid email or password')) return new Error('The system administrator email or password is incorrect.');
  if (raw.includes('temporarily locked')) return new Error('The system administrator account is temporarily locked. Please try again later.');
  if (raw.includes('inactive')) return new Error('This system administrator account is inactive. Please contact another administrator.');
  if (raw.includes('not found')) return new Error('The requested platform item could not be found. Refresh the page and try again.');
  if (raw.includes('already exists') || raw.includes('duplicate')) return new Error('This information already exists. Please choose a different value.');
  if (raw.includes('permission') || raw.includes('forbidden')) return new Error('You do not have permission to perform this action.');
  if (status === 401) return new Error('Your System Admin session has expired. Please sign in again.');
  if (status === 403) return new Error('You do not have permission to perform this action.');
  if (status === 404) return new Error('The requested platform item could not be found.');
  if (status === 409) return new Error('This change conflicts with existing platform information. Please review and try again.');
  if (status >= 500) return new Error('The platform could not complete that request. Please try again.');
  return new Error('We could not complete that request. Please try again.');
}

async function refreshSystemSession() {
  if (refreshing) return refreshing;
  refreshing = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: headersFor({ method: 'POST', headers: { 'X-Auth-Scope': 'system' } }), credentials: 'include' })
    .then((res) => { if (!res.ok) throw friendlySystemError(res.status, {}); })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function systemBootstrap(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch(`${API_BASE}/auth/session`, { method: 'GET', headers: { 'X-Auth-Scope': 'system' }, credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated === true && data.accountType === 'SYSTEM') return true;
    }
    await refreshSystemSession();
    const retried = await fetch(`${API_BASE}/auth/session`, { method: 'GET', headers: { 'X-Auth-Scope': 'system' }, credentials: 'include' });
    if (!retried.ok) return false;
    const data = await retried.json();
    return data.authenticated === true && data.accountType === 'SYSTEM';
  } catch { return false; }
}

export async function systemLogout(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: headersFor({ method: 'POST', headers: { 'X-Auth-Scope': 'system' } }), credentials: 'include' });
  } catch {
    // Navigation still proceeds when the API is unavailable.
  }
  sessionStorage.removeItem('itam_system_access_token');
  sessionStorage.removeItem('itam_system_refresh_token');
}

export async function systemFetch(path: string, options: RequestInit = {}, retry = true) {
  if (typeof window === 'undefined') throw new Error('System API is browser-only');
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: headersFor(options), credentials: 'include' });
  if (response.status === 401 && retry) {
    await refreshSystemSession();
    return systemFetch(path, options, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw friendlySystemError(response.status, body);
  }
  return response.json();
}
