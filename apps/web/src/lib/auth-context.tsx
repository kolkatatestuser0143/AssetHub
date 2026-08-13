'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken, login as apiLogin } from './api-client';

interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// NOTE: the backend currently returns accessToken/refreshToken in the
// response body instead of setting httpOnly cookies (see auth.controller.ts).
// Until that's fixed, we hold the refresh token in sessionStorage so a page
// reload doesn't force a full re-login. This is an interim measure, not the
// target architecture — sessionStorage is XSS-readable. Replace with a
// server-set httpOnly cookie + CSRF token flow, then this file simplifies
// (no sessionStorage, and middleware.ts can take over route protection).
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
        sessionStorage.removeItem(REFRESH_KEY);
        setStatus('unauthenticated');
      });
  }, []);

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password);
    sessionStorage.setItem(REFRESH_KEY, result.refreshToken);
    setStatus('authenticated');
  }

  function logout() {
    setAccessToken(null);
    sessionStorage.removeItem(REFRESH_KEY);
    setStatus('unauthenticated');
    router.push('/login');
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