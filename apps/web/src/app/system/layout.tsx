'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, BarChart3, Building2, CreditCard, FileSearch, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { systemBootstrap, systemLogout } from '../../lib/system-api';

const navigation: Array<{ label: string; href: string; icon: LucideIcon; exact?: boolean }> = [
  { label: 'Overview', href: '/system', icon: LayoutDashboard, exact: true },
  { label: 'Tenants', href: '/system/tenants', icon: Building2 },
  { label: 'Platform Users', href: '/system/users', icon: Users },
  { label: 'Roles & Permissions', href: '/system/roles', icon: ShieldCheck },
  { label: 'Plans', href: '/system/plans', icon: CreditCard },
  { label: 'Subscriptions', href: '/system/subscriptions', icon: CreditCard },
  { label: 'Revoked Tenants', href: '/system/subscriptions/revoked', icon: ShieldCheck },
  { label: 'Audit & Security', href: '/system/audit', icon: FileSearch },
  { label: 'System Health', href: '/system/health', icon: Activity },
  { label: 'Analytics', href: '/system/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/system/settings', icon: Settings },
];

const LOGIN_PATH = '/system/login';

const SYSTEM_THEME: Record<string, string> = {
  '--theme-primary': '#2563eb', '--theme-primary-hover': '#1d4ed8', '--theme-primary-soft': '#eff6ff',
  '--theme-sidebar': '#020617', '--theme-sidebar-text': '#cbd5e1', '--theme-sidebar-hover': '#0f172a',
  '--theme-sidebar-active': '#2563eb', '--theme-focus': '#3b82f6', '--theme-link': '#2563eb',
};

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === LOGIN_PATH;
  const [checkingAuth, setCheckingAuth] = useState(!isLoginPage);
  const [authenticated, setAuthenticated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isLoginPage) { setAuthenticated(false); setCheckingAuth(false); setMobileOpen(false); return () => { cancelled = true; }; }
    setCheckingAuth(true);
    void systemBootstrap().then(ok => { if (cancelled) return; if (!ok) { setAuthenticated(false); setCheckingAuth(false); router.replace(LOGIN_PATH); return; } setAuthenticated(true); setCheckingAuth(false); });
    return () => { cancelled = true; };
  }, [isLoginPage, router, pathname]);

  const title = useMemo(() => navigation.find(item => item.exact ? pathname === item.href : pathname.startsWith(item.href))?.label ?? 'System Console', [pathname]);
  const filteredNavigation = useMemo(() => navigation.filter(item => !navSearch.trim() || item.label.toLowerCase().includes(navSearch.toLowerCase())), [navSearch]);

  async function logout() { await systemLogout(); setAuthenticated(false); setMobileOpen(false); router.replace(LOGIN_PATH); }

  useEffect(() => {
    if (isLoginPage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLoginPage]);

  if (isLoginPage) return <div data-system-theme className="min-h-screen" style={SYSTEM_THEME}>{children}</div>;
  if (checkingAuth || !authenticated) return <div data-system-theme className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-400" style={SYSTEM_THEME}>Loading system console…</div>;

  const sidebar = <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[var(--theme-sidebar)] text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
      <Link href="/system" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--theme-sidebar-active)] shadow-lg shadow-blue-600/20"><ShieldCheck className="h-5 w-5" /></span><div><p className="font-semibold tracking-tight">AssetHub</p><p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Platform</p></div></Link>
      <button className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
    </div>
    <div className="border-b border-white/10 px-5 py-4"><div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-blue-300">System Administrator</p><p className="mt-1 text-sm font-medium text-white">Platform Control Center</p></div></div>
    <div className="px-3 pt-3"><button onClick={() => setSearchOpen(true)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"><Search className="h-4 w-4" /><span className="flex-1">Search navigation</span><kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></button></div>
    <nav className="system-scrollbar flex-1 overflow-y-auto px-3 py-4"><p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Platform</p><div className="space-y-1">{filteredNavigation.map(item => { const active = item.exact ? pathname === item.href : pathname.startsWith(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-150 ${active ? 'bg-[var(--theme-sidebar-active)] text-white shadow-lg shadow-blue-600/20' : 'text-slate-300 hover:bg-[var(--theme-sidebar-hover)] hover:text-white'}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</div></nav>
    <div className="border-t border-white/10 p-3"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-200"><LogOut className="h-4 w-4" />Sign out</button></div>
  </aside>;

  return <div data-system-theme className="min-h-screen bg-slate-950 text-slate-950" style={SYSTEM_THEME}>
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
    {searchOpen && <div className="fixed inset-0 z-[70] bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setSearchOpen(false)}><div className="mx-auto mt-[12vh] max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-slate-100 px-4"><Search className="h-5 w-5 text-slate-400" /><input autoFocus value={navSearch} onChange={e => setNavSearch(e.target.value)} placeholder="Search system navigation..." className="h-14 flex-1 bg-transparent text-sm outline-none" /><kbd className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-400">ESC</kbd></div><div className="max-h-80 overflow-y-auto p-2">{navigation.filter(item => !navSearch.trim() || item.label.toLowerCase().includes(navSearch.toLowerCase())).map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => { setSearchOpen(false); setNavSearch(''); }} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-link)]"><Icon className="h-4 w-4" />{item.label}<ArrowRightIcon /></Link>; })}{navigation.filter(item => !navSearch.trim() || item.label.toLowerCase().includes(navSearch.toLowerCase())).length === 0 && <div className="p-8 text-center text-sm text-slate-400">No navigation matches.</div>}</div></div></div>}
    {sidebar}
    <div className="min-h-screen lg:pl-72"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"><div className="flex h-16 items-center gap-4 px-4 sm:px-6"><button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button><button onClick={() => setSearchOpen(true)} className="hidden min-w-0 flex-1 items-center gap-3 text-left sm:flex"><div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">AssetHub Platform</p><h1 className="truncate text-lg font-semibold text-slate-950">{title}</h1></div></button><div className="flex min-w-0 flex-1 sm:hidden"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Platform</p><h1 className="truncate text-lg font-semibold text-slate-950">{title}</h1></div></div><div className="hidden items-center gap-3 sm:flex"><div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">System session</div><button onClick={logout} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button></div></div></header><main className="min-h-[calc(100vh-4rem)] bg-slate-50"><div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div></main></div>
  </div>;
}

function ArrowRightIcon() { return <span className="ml-auto text-slate-300">→</span>; }
