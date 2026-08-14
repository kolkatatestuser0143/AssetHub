const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

let refreshing: Promise<void> | null = null;

async function refreshSystemSession() {
  if (refreshing) return refreshing;
  refreshing = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  }).then((res) => {
    if (!res.ok) throw new Error('System administrator session expired');
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function systemBootstrap(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    await refreshSystemSession();
    return true;
  } catch {
    return false;
  }
}

export async function systemLogout(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch {
    // Cookie state is server-managed; navigation still proceeds on network failure.
  }
}

export async function systemFetch(path: string, options: RequestInit = {}, retry = true) {
  if (typeof window === 'undefined') throw new Error('System API is browser-only');

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  });

  if (response.status === 401 && retry) {
    await refreshSystemSession();
    return systemFetch(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${response.status}`);
  }

  return response.json();
}
