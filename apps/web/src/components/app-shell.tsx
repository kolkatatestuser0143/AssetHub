'use client';

import Link from 'next/link';
import { LayoutDashboard, Laptop, Building2, Users, ShieldCheck, Settings, FileClock, KeyRound, Boxes, MapPin, Truck, ClipboardCheck, LogOut, Menu, X, Workflow } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import TenantBackground from './tenant-background';
import CompanyScopeControl from './company-scope-control';
import { Sidebar, type SidebarGroup } from './navigation/Sidebar';
import { useAuth } from '../lib/auth-context';

type AdminLevel = 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN';
type NavItem = { href: string; label: string; Icon: typeof LayoutDashboard; levels: AdminLevel[] };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: 'Workspace', items: [{ href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, levels: ['EMPLOYEE', 'COMPANY_ADMIN', 'TENANT_ADMIN'] }] },
  { label: 'Inventory', items: [
    { href: '/assets', label: 'Assets', Icon: Laptop, levels: ['EMPLOYEE', 'COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/asset-types', label: 'Asset Types', Icon: Boxes, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/vendors', label: 'Vendors', Icon: Truck, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
  ] },
  { label: 'Operations', items: [
    { href: '/assignments', label: 'Asset Operations', Icon: Workflow, levels: ['EMPLOYEE', 'COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/assets/transfers', label: 'Transfers', Icon: ClipboardCheck, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
  ] },
  { label: 'People & Organization', items: [
    { href: '/employees', label: 'Employees', Icon: Users, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/tenant-admins', label: 'Tenant Admins', Icon: ShieldCheck, levels: ['TENANT_ADMIN'] },
    { href: '/companies', label: 'Companies', Icon: Building2, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/plants', label: 'Sites', Icon: Building2, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/locations', label: 'Locations', Icon: MapPin, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/business-units', label: 'Departments', Icon: Building2, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
  ] },
  { label: 'Access & Security', items: [
    { href: '/roles', label: 'Roles & Permissions', Icon: ShieldCheck, levels: ['TENANT_ADMIN'] },
    { href: '/identity', label: 'Identity & SSO', Icon: KeyRound, levels: ['TENANT_ADMIN'] },
    { href: '/audit', label: 'Audit Logs', Icon: FileClock, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
  ] },
];

const levelLabel = (level: AdminLevel) => level === 'TENANT_ADMIN' ? 'Tenant Admin' : level === 'COMPANY_ADMIN' ? 'Company Admin' : 'Employee';
function initials(name: string) { const parts = name.trim().split(/\s+/).filter(Boolean); return (parts.slice(0, 2).map((part) => part[0]).join('') || 'TH').toUpperCase(); }

export default function AppShell({ children }: { children: ReactNode }) {
  const { adminLevel, tenantProfile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = tenantProfile?.name ?? 'Tenant';
  const visibleGroups: SidebarGroup[] = groups
    .map((group) => ({ label: group.label, items: group.items.filter((item) => item.levels.includes(adminLevel)).map(({ href, label, Icon }) => ({ href, label, icon: Icon })) }))
    .filter((group) => group.items.length > 0);

  const brand = <Link href="/dashboard" aria-label="AssetHub dashboard" className="ui-sidebar-brand block w-[190px]"><img src="/assethub-logo-dark.svg" alt="AssetHub" className="h-auto w-full" /></Link>;
  const context = <div className="ui-sidebar-context rounded-xl bg-white/5 px-3 py-2.5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Access level</div><div className="mt-1 text-sm font-semibold text-white">{levelLabel(adminLevel)}</div><div className="mt-1 truncate text-[11px] text-slate-400">{tenantProfile?.company?.name ?? displayName}</div></div>;

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); setMobileOpen(false); }
  }

  const footer = <div className="space-y-1">
    <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-white/5 hover:text-white"><Settings size={17} aria-hidden="true" />Settings</Link>
    <button type="button" onClick={() => void signOut()} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl p-3 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-60"><LogOut size={17} aria-hidden="true" />{loggingOut ? 'Signing out…' : 'Sign out'}</button>
  </div>;

  return <div className="min-h-screen bg-slate-50">
    <Sidebar groups={visibleGroups} variant="tenant" mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} brand={brand} context={context} footer={footer} ariaLabel="Tenant navigation" />
    <div className="relative min-h-screen lg:pl-64">
      <TenantBackground />
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-4">
        <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-[var(--theme-primary-soft)] lg:hidden">{mobileOpen ? <X size={19}/> : <Menu size={19}/>}</button>
        <div className="min-w-0 flex-1">
          <div className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:block">AssetHub Tenant Console</div>
          <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
        </div>
        <CompanyScopeControl className="hidden sm:block" />
        <div className="hidden items-center gap-3 md:flex">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-xs font-bold text-[var(--theme-link)]">{initials(displayName)}</span>
          <div><div className="text-xs font-bold text-slate-900">{levelLabel(adminLevel)}</div><div className="max-w-52 truncate text-[11px] text-slate-500">{tenantProfile?.primaryEmail ?? 'Signed in'}</div></div>
        </div>
        <button type="button" onClick={() => void signOut()} disabled={loggingOut} aria-label="Sign out" title="Sign out" className="hidden h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 md:grid"><LogOut size={17}/></button>
      </header>
      <div className="border-b border-slate-200 bg-white/85 px-3 py-2 backdrop-blur sm:hidden"><CompanyScopeControl className="w-full" /></div>
      <main className="relative z-10 mx-auto max-w-[1600px] bg-transparent p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
