const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

const ACCESS_TOKEN_KEY = 'itam_system_access_token';
const REFRESH_TOKEN_KEY = 'itam_system_refresh_token';

let refreshing: Promise<string> | null = null;

async function refreshSystemToken(): Promise<string> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('System administrator session required');

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      throw new Error('System administrator session expired');
    }

    const data = await response.json();
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    return data.accessToken as string;
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

export async function systemBootstrap(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!sessionStorage.getItem(REFRESH_TOKEN_KEY)) return false;

  try {
    await refreshSystemToken();
    return true;
  } catch {
    return false;
  }
}

export async function systemLogout(): Promise<void> {
  if (typeof window === 'undefined') return;

  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Always clear local credentials even if the API is unreachable.
    }
  }

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function systemFetch(path: string, options: RequestInit = {}, retry = true) {
  if (typeof window === 'undefined') throw new Error('System API is browser-only');

  let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) token = await refreshSystemToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 && retry) {
    await refreshSystemToken();
    return systemFetch(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${response.status}`);
  }

  return response.json();
}
