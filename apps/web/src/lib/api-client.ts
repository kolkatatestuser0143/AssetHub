const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

let refreshing: Promise<void> | null = null;

export function setAccessToken(_token: string | null) {}
export function getAccessToken() { return null; }

async function refreshSession() {
  if (refreshing) return refreshing;
  refreshing = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': 'tenant' },
    credentials: 'include',
  }).then((res) => {
    if (!res.ok) throw new Error('Session expired');
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  });

  if (res.status === 401 && retry && path !== '/auth/refresh') {
    await refreshSession();
    return apiFetch(path, options, false);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function downloadFile(path: string, retry = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });

  if (res.status === 401 && retry && path !== '/auth/refresh') {
    await refreshSession();
    return downloadFile(path, false);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return {
    blob: await res.blob(),
    filename: getFilename(res.headers.get('content-disposition')),
  };
}

function getFilename(contentDisposition: string | null) {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? 'download';
}

export async function login(email: string, password: string) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function systemLogin(email: string, password: string) {
  return apiFetch('/auth/system/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': 'tenant' },
      credentials: 'include',
    });
  } catch {
    // Server logout may be unreachable; the browser has no bearer token to clear.
  }
  sessionStorage.removeItem('itam_refresh_token');
  sessionStorage.removeItem('itam_access_token');
}
