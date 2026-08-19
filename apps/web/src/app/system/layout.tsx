'use client';

import Link from 'next/link';
import { Activity, BarChart3, Building2, CreditCard, FileSearch, LayoutDashboard, LogOut, ServerCog, Settings, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar, type SidebarGroup } from '../../components/navigation/Sidebar';
import SystemModalBridge from '../../components/system/SystemModalBridge';
import { systemBootstrap, systemLogout } from '../../lib/system-api';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };
const groups: NavGroup[] = [
  { label: 'Overview', items: [{ label: 'Dashboard', href: '/system', icon: LayoutDashboard, exact: true }, { label: 'Analytics', href: '/system/analytics', icon: BarChart3 }] },
  { label: 'Tenant Operations', items: [{ label: 'Tenants', href: '/system/tenants', icon: Building2 }, { label: 'Platform Users', href: '/system/users', icon: Users }] },
  { label: 'Billing & Plans', items: [{ label: 'Plans', href: '/system/plans', icon: CreditCard }, { label: 'Subscriptions', href: '/system/subscriptions', icon: CreditCard }, { label: 'Usage', href: '/system/usage', icon: Activity }] },
  { label: 'Security & Access', items: [{ label: 'Roles & Permissions', href: '/system/roles', icon: ShieldCheck }, { label: 'Audit & Security', href: '/system/audit', icon: FileSearch }, { label: 'Sessions & Security', href: '/system/security', icon: ShieldAlert }] },
  { label: 'Operations', items: [{ label: 'System Health', href: '/system/health', icon: Activity }, { label: 'Background Jobs', href: '/system/operations', icon: ServerCog }] },
];
const LOGIN_PATH = '/system/login';
const SYSTEM_THEME: Record<string, string> = { '--theme-primary': '#2563eb', '--theme-primary-hover': '#1d4ed8', '--theme-primary-soft': '#eff6ff', '--theme-sidebar': '#020617', '--theme-sidebar-text': '#cbd5e1', '--theme-sidebar-hover': '#0f172a', '--theme-sidebar-active': '#2563eb', '--theme-focus': '#3b82f6', '--theme-link': '#2563eb' };

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === LOGIN_PATH;
  const [checkingAuth, setCheckingAuth] = useState(!isLoginPage);
  const [authenticated, setAuthenticated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { let cancelled = false; if (isLoginPage) { setAuthenticated(false); setCheckingAuth(false); setMobileOpen(false); return () => { cancelled = true; }; } setCheckingAuth(true); void systemBootstrap().then((ok) => { if (cancelled) return; if (!ok) { setAuthenticated(false); setCheckingAuth(false); router.replace(LOGIN_PATH); return; } setAuthenticated(true); setCheckingAuth(false); }).catch(() => { if (!cancelled) { setAuthenticated(false); setCheckingAuth(false); router.replace(LOGIN_PATH); } }); return () => { cancelled = true; }; }, [isLoginPage, router, pathname]);
  const title = useMemo(() => { for (const group of groups) for (const item of group.items) if (item.exact ? pathname === item.href : pathname.startsWith(item.href)) return item.label; return 'System Console'; }, [pathname]);
  async function logout() { await systemLogout(); setAuthenticated(false); setMobileOpen(false); router.replace(LOGIN_PATH); }
  if (isLoginPage) return <div data-system-theme className="min-h-screen" style={SYSTEM_THEME}>{children}</div>;
  if (checkingAuth || !authenticated) return <div data-system-theme className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-400" style={SYSTEM_THEME}>Loading system console…</div>;

  const sidebarGroups: SidebarGroup[] = groups.map((group) => ({ label: group.label, items: group.items.map(({ href, label, icon, exact }) => ({ href, label, icon, exact })) }));
  const brand = <Link href="/system" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20"><ShieldCheck className="h-5 w-5" /></span><div><p className="font-semibold tracking-tight">AssetHub</p><p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Platform</p></div></Link>;
  const context = <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-blue-300">System Administrator</p><p className="mt-1 text-sm font-medium text-white">Platform Control Center</p></div>;
  const footer = <><Link href="/system/settings" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"><Settings className="h-4 w-4" />Settings</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-200"><LogOut className="h-4 w-4" />Sign out</button></>;
  return <div data-system-theme className="min-h-screen bg-slate-950 text-slate-950" style={SYSTEM_THEME}><Sidebar groups={sidebarGroups} variant="system" mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} brand={brand} context={context} footer={footer} ariaLabel="System navigation" /><div className="min-h-screen lg:pl-64"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"><div className="flex h-16 items-center gap-4 px-4 sm:px-6"><button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button><div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">AssetHub Platform</p><h1 className="truncate text-lg font-semibold text-slate-950">{title}</h1></div><div className="hidden items-center gap-3 sm:flex"><div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">System session</div><button onClick={logout} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button></div></div></header><main className="min-h-[calc(100vh-4rem)] bg-slate-50"><div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div></main></div><SystemModalBridge /></div>;
}
