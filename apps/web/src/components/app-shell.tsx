'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Laptop, Building2, Users, ShieldCheck, Settings,
  FileClock, KeyRound, Boxes, Menu, MapPin, Truck, ClipboardCheck,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import TenantBackground from './tenant-background';
import { useAuth } from '../lib/auth-context';

type NavItem = { href: string; label: string; Icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    ],
  },
  {
    label: 'Asset Management',
    items: [
      { href: '/assets', label: 'Assets', Icon: Laptop },
      { href: '/asset-types', label: 'Asset Types', Icon: Boxes },
      { href: '/vendors', label: 'Vendors', Icon: Truck },
      { href: '/assignments', label: 'Assignments', Icon: ClipboardCheck },
    ],
  },
  {
    label: 'People & Organization',
    items: [
      { href: '/employees', label: 'Employees', Icon: Users },
      { href: '/tenant-admins', label: 'Tenant Admins', Icon: ShieldCheck },
      { href: '/companies', label: 'Companies', Icon: Building2 },
      { href: '/plants', label: 'Sites', Icon: Building2 },
      { href: '/locations', label: 'Locations', Icon: MapPin },
      { href: '/business-units', label: 'Departments', Icon: Building2 },
    ],
  },
  {
    label: 'Access & Security',
    items: [
      { href: '/roles', label: 'Roles & Permissions', Icon: ShieldCheck },
      { href: '/identity', label: 'Identity & SSO', Icon: KeyRound },
      { href: '/audit', label: 'Audit Logs', Icon: FileClock },
    ],
  },
];

const levelLabel = (level: 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN') =>
  level === 'TENANT_ADMIN' ? 'Tenant Admin' : level === 'COMPANY_ADMIN' ? 'Company Admin' : 'Employee';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((part) => part[0]).join('') || 'TH').toUpperCase();
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { adminLevel, tenantProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const displayName = tenantProfile?.name ?? 'Tenant';

  const renderNav = () => (
    <aside className="flex h-full flex-col bg-[var(--theme-sidebar)] text-[var(--theme-sidebar-text)]">
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link href="/dashboard" aria-label="AssetHub dashboard" className="block w-[190px]">
          <img src="/assethub-logo-dark.svg" alt="AssetHub" className="h-auto w-full" />
        </Link>
      </div>
      <nav className="flex-1 overflow-auto px-3 py-4">
        {groups.map((group) => (
          <section key={group.label} className="mb-5 last:mb-0">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active
                      ? 'bg-[var(--theme-sidebar-active)] text-white shadow-sm'
                      : 'hover:bg-[var(--theme-sidebar-hover)] hover:text-white'}`}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
      <Link href="/settings" className="flex items-center gap-3 border-t border-white/10 p-4 text-sm hover:text-white">
        <Settings size={17} aria-hidden="true" />
        Settings
      </Link>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-y-0 left-0 hidden w-64 lg:block">{renderNav()}</div>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 lg:hidden">
          <div className="h-full w-72">{renderNav()}</div>
        </div>
      )}
      <div className="relative min-h-screen lg:pl-64">
        <TenantBackground />
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <button onClick={() => setOpen(true)} aria-label="Open navigation" className="rounded-xl p-2 hover:bg-[var(--theme-primary-soft)] lg:hidden">
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-xs font-bold text-[var(--theme-link)]">
              {initials(displayName)}
            </div>
            <div className="hidden sm:block">
              <b className="text-xs">{displayName}</b>
              <div className="text-[11px] text-slate-500">{levelLabel(adminLevel)}</div>
            </div>
          </div>
        </header>
        <main className="relative z-10 mx-auto max-w-[1600px] bg-transparent p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
