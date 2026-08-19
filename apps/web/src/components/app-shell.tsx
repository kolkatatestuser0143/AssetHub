'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Laptop, Building2, Users, ShieldCheck, Settings, FileClock, KeyRound, Boxes, Menu, MapPin, Truck, ClipboardCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import TenantBackground from './tenant-background';
import { useAuth } from '../lib/auth-context';

type AdminLevel = 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN';
type NavItem = { href: string; label: string; Icon: typeof LayoutDashboard; levels: AdminLevel[] };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: 'Workspace', items: [{ href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, levels: ['EMPLOYEE', 'COMPANY_ADMIN', 'TENANT_ADMIN'] }] },
  { label: 'Asset Management', items: [
    { href: '/assets', label: 'Assets', Icon: Laptop, levels: ['EMPLOYEE', 'COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/asset-types', label: 'Asset Types', Icon: Boxes, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/vendors', label: 'Vendors', Icon: Truck, levels: ['COMPANY_ADMIN', 'TENANT_ADMIN'] },
    { href: '/assignments', label: 'Assignments', Icon: ClipboardCheck, levels: ['EMPLOYEE', 'COMPANY_ADMIN', 'TENANT_ADMIN'] },
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
  const pathname = usePathname();
  const { adminLevel, tenantProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const displayName = tenantProfile?.name ?? 'Tenant';
  const visibleGroups = groups.map((group) => ({ ...group, items: group.items.filter((item) => item.levels.includes(adminLevel)) })).filter((group) => group.items.length > 0);

  const renderNav = () => (
    <aside className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--theme-sidebar)] text-[var(--theme-sidebar-text)]">
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4"><Link href="/dashboard" aria-label="AssetHub dashboard" className="block w-[190px]"><img src="/assethub-logo-dark.svg" alt="AssetHub" className="h-auto w-full" /></Link></div>
      <div className="shrink-0 border-b border-white/10 px-4 py-3"><div className="rounded-xl bg-white/5 px-3 py-2.5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Access level</div><div className="mt-1 text-sm font-semibold text-white">{levelLabel(adminLevel)}</div></div></div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-gutter:stable]">
        {visibleGroups.map((group) => <section key={group.label} className="mb-5 last:mb-0"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.label}</p><div className="space-y-1">{group.items.map(({ href, label, Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? 'bg-[var(--theme-sidebar-active)] text-white shadow-sm' : 'hover:bg-[var(--theme-sidebar-hover)] hover:text-white'}`}><Icon size={17} aria-hidden="true" /><span>{label}</span></Link>; })}</div></section>)}
      </nav>
      <div className="shrink-0 border-t border-white/10"><Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 p-4 text-sm hover:text-white"><Settings size={17} aria-hidden="true" />Settings</Link></div>
    </aside>
  );

  return <div className="min-h-screen bg-slate-50"><div className="fixed inset-y-0 left-0 hidden h-screen w-64 lg:block">{renderNav()}</div>{open && <div className="fixed inset-0 z-50 bg-slate-950/70 lg:hidden"><div className="h-screen w-72">{renderNav()}</div></div>}<div className="relative min-h-screen lg:pl-64"><TenantBackground /><header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur"><button onClick={() => setOpen(true)} aria-label="Open navigation" className="rounded-xl p-2 hover:bg-[var(--theme-primary-soft)] lg:hidden"><Menu size={20} /></button><div className="min-w-0 flex-1"><div className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:block">AssetHub Tenant Console</div><div className="truncate text-sm font-semibold text-slate-900">{displayName}</div></div><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-xs font-bold text-[var(--theme-link)]">{initials(displayName)}</span><div className="hidden sm:block"><div className="text-xs font-bold text-slate-900">{levelLabel(adminLevel)}</div><div className="text-[11px] text-slate-500">{tenantProfile?.primaryEmail ?? 'Signed in'}</div></div></div></header><main className="relative z-10 mx-auto max-w-[1600px] bg-transparent p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
