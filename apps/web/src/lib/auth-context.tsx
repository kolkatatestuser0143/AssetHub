'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, login as apiLogin, logout as apiLogout } from './api-client';

export type TenantFeatures = Record<string, boolean | number | string | null | undefined>;

interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  themePreset: string;
  features: TenantFeatures;
  hasFeature: (key: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

const PRESETS: Record<string, Record<string, string>> = {
  trial: { primary: '#64748b', primaryHover: '#475569', primarySoft: '#f1f5f9', sidebar: '#1e293b', sidebarText: '#cbd5e1', sidebarHover: '#334155', sidebarActive: '#64748b', focus: '#64748b', link: '#475569' },
  starter: { primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#eff6ff', sidebar: '#0f172a', sidebarText: '#cbd5e1', sidebarHover: '#1e293b', sidebarActive: '#2563eb', focus: '#3b82f6', link: '#2563eb' },
  professional: { primary: '#7c3aed', primaryHover: '#6d28d9', primarySoft: '#f5f3ff', sidebar: '#21133f', sidebarText: '#ddd6fe', sidebarHover: '#31205b', sidebarActive: '#7c3aed', focus: '#8b5cf6', link: '#7c3aed' },
  enterprise: { primary: '#b7791f', primaryHover: '#975a16', primarySoft: '#fffbeb', sidebar: '#292215', sidebarText: '#f3e8c8', sidebarHover: '#3b311f', sidebarActive: '#b7791f', focus: '#d69e2e', link: '#a16207' },
  restricted: { primary: '#dc2626', primaryHover: '#b91c1c', primarySoft: '#fef2f2', sidebar: '#2b1215', sidebarText: '#fecaca', sidebarHover: '#451a1d', sidebarActive: '#dc2626', focus: '#ef4444', link: '#dc2626' },
};

function applyTheme(preset: string) {
  const root = document.documentElement;
  const values = PRESETS[preset] ?? PRESETS.starter;
  root.dataset.tenantTheme = PRESETS[preset] ? preset : 'starter';
  for (const [key, value] of Object.entries(values)) root.style.setProperty(`--theme-${key}`, value);
}

function isFeatureEnabled(features: TenantFeatures, key: string) {
  const value = features[key];
  return value === true || (typeof value === 'string' && value.toLowerCase() === 'true');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [themePreset, setThemePreset] = useState('starter');
  const [features, setFeatures] = useState<TenantFeatures>({});
  const router = useRouter();

  async function loadTheme() {
    try {
      const license = await apiFetch('/tenant/license');
      const preset = typeof license?.themePreset === 'string' ? license.themePreset : 'starter';
      const nextFeatures = license?.features && typeof license.features === 'object' ? license.features as TenantFeatures : {};
      setThemePreset(preset);
      setFeatures(nextFeatures);
      applyTheme(preset);
    } catch {
      setThemePreset('starter');
      setFeatures({});
      applyTheme('starter');
    }
  }

  useEffect(() => {
    void fetch(`${API_BASE}/auth/session`, {
      method: 'GET',
      headers: { 'X-Auth-Scope': 'tenant' },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(async (data) => {
        if (!data.authenticated || data.accountType !== 'TENANT') {
          setStatus('unauthenticated');
          return;
        }
        setStatus('authenticated');
        await loadTheme();
      })
      .catch(() => setStatus('unauthenticated'));
  }, []);

  async function login(email: string, password: string) {
    await apiLogin(email, password);
    setStatus('authenticated');
    await loadTheme();
  }

  async function logout() {
    await apiLogout();
    setStatus('unauthenticated');
    setThemePreset('starter');
    setFeatures({});
    applyTheme('starter');
    router.replace('/login');
  }

  const hasFeature = (key: string) => isFeatureEnabled(features, key);

  return <AuthContext.Provider value={{ status, themePreset, features, hasFeature, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
