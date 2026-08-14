'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, login as apiLogin, logout as apiLogout } from './api-client';

interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const router = useRouter();

  useEffect(() => {
    void fetch(`${API_BASE}/auth/session`, {
      method: 'GET',
      headers: { 'X-Auth-Scope': 'tenant' },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setStatus(data.authenticated ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('unauthenticated'));
  }, []);

  async function login(email: string, password: string) {
    await apiLogin(email, password);
    setStatus('authenticated');
  }

  async function logout() {
    await apiLogout();
    setStatus('unauthenticated');
    router.replace('/login');
  }

  return <AuthContext.Provider value={{ status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
