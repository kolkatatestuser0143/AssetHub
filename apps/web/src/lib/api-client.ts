const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (res.status === 401 && retry && typeof window !== 'undefined') {
    const refreshToken = sessionStorage.getItem('itam_refresh_token');
    if (refreshToken && path !== '/auth/refresh') {
      const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setAccessToken(data.accessToken);
        sessionStorage.setItem('itam_refresh_token', data.refreshToken);
        return apiFetch(path, options, false);
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const result = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(result.accessToken);
  return result;
}

export async function systemLogin(email: string, password: string) {
  const result = await apiFetch('/auth/system/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(result.accessToken);
  return result;
}

export async function logout() {
  if (typeof window === 'undefined') return;
  const token = accessToken;
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
    } catch {
      // Clear client state even if the API is unreachable.
    }
  }
  accessToken = null;
  sessionStorage.removeItem('itam_refresh_token');
}
