'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken, login as apiLogin, logout as apiLogout } from './api-client';

interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const REFRESH_KEY = 'itam_refresh_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem(REFRESH_KEY);
    if (!stored) {
      setStatus('unauthenticated');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1'}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setAccessToken(data.accessToken);
        sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
        setStatus('authenticated');
      })
      .catch(() => {
        setAccessToken(null);
        sessionStorage.removeItem(REFRESH_KEY);
        setStatus('unauthenticated');
      });
  }, []);

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password);
    sessionStorage.setItem(REFRESH_KEY, result.refreshToken);
    setStatus('authenticated');
  }

  async function logout() {
    await apiLogout();
    setStatus('unauthenticated');
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ status, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
