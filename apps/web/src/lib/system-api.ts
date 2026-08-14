const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

export async function systemFetch(path: string, options: RequestInit = {}) {
  if (typeof window === 'undefined') throw new Error('System API is browser-only');
  const token = sessionStorage.getItem('itam_system_access_token');
  if (!token) throw new Error('System administrator session required');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}
