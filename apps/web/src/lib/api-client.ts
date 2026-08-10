const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

// NOTE: storing the access token in memory (module-level variable) and
// the refresh token in an httpOnly cookie set by the API is the safer
// pattern (avoids XSS-readable localStorage tokens). This scaffold uses
// a simple in-memory holder to keep the example short — wire actual
// httpOnly cookie handling before this goes past local dev.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (res.status === 401) {
    // TODO: attempt refresh via /auth/refresh (refresh token in httpOnly
    // cookie), retry once, then redirect to /login on second failure.
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
