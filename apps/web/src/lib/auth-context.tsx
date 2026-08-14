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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const router = useRouter();

  useEffect(() => {
    void fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1'}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': 'tenant' },
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        setStatus('authenticated');
      })
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
