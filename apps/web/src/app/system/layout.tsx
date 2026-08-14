'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, BarChart3, Building2, CreditCard, FileSearch, LayoutDashboard,
  LogOut, Menu, Settings, ShieldCheck, Users, X, type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const navigation: Array<{ label: string; href: string; icon: LucideIcon; exact?: boolean }> = [
  { label: 'Overview', href: '/system', icon: LayoutDashboard, exact: true },
  { label: 'Tenants', href: '/system/tenants', icon: Building2 },
  { label: 'Platform Users', href: '/system/users', icon: Users },
  { label: 'Roles & Permissions', href: '/system/roles', icon: ShieldCheck },
  { label: 'Subscriptions', href: '/system/subscriptions', icon: CreditCard },
  { label: 'Audit & Security', href: '/system/audit', icon: FileSearch },
  { label: 'System Health', href: '/system/health', icon: Activity },
  { label: 'Analytics', href: '/system/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/system/settings', icon: Settings },
];

const LOGIN_PATH = '/system/login';
const ACCESS_TOKEN_KEY = 'itam_system_access_token';
const REFRESH_TOKEN_KEY = 'itam_system_refresh_token';

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(pathname !== LOGIN_PATH);
  const [authenticated, setAuthenticated] = useState(pathname === LOGIN_PATH);

  const isLoginPage = pathname === LOGIN_PATH;

  useEffect(() => {
    if (isLoginPage) {
      setAuthenticated(false);
      setCheckingAuth(false);
      return;
    }

    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);

    if (!accessToken && !refreshToken) {
      setAuthenticated(false);
      setCheckingAuth(false);
      router.replace(LOGIN_PATH);
      return;
    }

    setAuthenticated(true);
    setCheckingAuth(false);
  }, [isLoginPage, router]);

  const title = useMemo(
    () => navigation.find((item) => item.exact ? pathname === item.href : pathname.startsWith(item.href))?.label ?? 'System Console',
    [pathname],
  );

  function logout() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    setAuthenticated(false);
    router.replace(LOGIN_PATH);
  }

  if (isLoginPage) return <>{children}</>;

  if (checkingAuth || !authenticated) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-400">Loading system console…</div>;
  }

  const sidebar = (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link href="/system" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20"><ShieldCheck className="h-5 w-5" /></span>
          <div><p className="font-semibold tracking-tight">AssetHub</p><p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Platform</p></div>
        </Link>
        <button className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <div className="border-b border-white/10 px-5 py-4"><div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-blue-300">System Administrator</p><p className="mt-1 text-sm font-medium text-white">Platform Control Center</p></div></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Platform</p>
        <div className="space-y-1">
          {navigation.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4" />{item.label}</Link>;
          })}
        </div>
      </nav>
      <div className="border-t border-white/10 p-3"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-200"><LogOut className="h-4 w-4" />Sign out</button></div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-950">
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
      {sidebar}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">AssetHub Platform</p><h1 className="truncate text-lg font-semibold text-slate-950">{title}</h1></div>
            <div className="hidden items-center gap-3 sm:flex"><div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">System session</div><button onClick={logout} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button></div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] bg-slate-50"><div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div></main>
      </div>
    </div>
  );
}
