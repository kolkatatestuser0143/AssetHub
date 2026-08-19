'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
};

export type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

export function Sidebar({
  groups,
  variant = 'tenant',
  mobileOpen = false,
  onMobileClose,
  brand,
  context,
  footer,
  ariaLabel = 'Navigation',
}: {
  groups: SidebarGroup[];
  variant?: 'tenant' | 'system';
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  brand: ReactNode;
  context?: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const dark = variant === 'system';
  const panel = dark ? 'bg-slate-950 text-white' : 'bg-[var(--theme-sidebar)] text-[var(--theme-sidebar-text)]';
  const itemActive = dark ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-[var(--theme-sidebar-active)] text-white shadow-sm';
  const itemIdle = dark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'hover:bg-[var(--theme-sidebar-hover)] hover:text-white';

  const content = (
    <aside className={`flex h-screen min-h-0 w-full flex-col overflow-hidden shadow-2xl ${panel}`}>
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4">{brand}</div>
      {context ? <div className="shrink-0 border-b border-white/10 px-4 py-3">{context}</div> : null}
      <nav aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-gutter:stable]">
        {groups.map((group) => (
          <section key={group.label} className="mb-5 last:mb-0">
            <p className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} onClick={onMobileClose} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? itemActive : itemIdle}`}><Icon size={17}/><span className="min-w-0 flex-1">{item.label}</span></Link>;
              })}
            </div>
          </section>
        ))}
      </nav>
      {footer ? <div className="shrink-0 border-t border-white/10 p-3">{footer}</div> : null}
    </aside>
  );

  return (
    <>
      <div className="fixed inset-y-0 left-0 hidden h-screen w-64 lg:block">{content}</div>
      {mobileOpen ? <div className="fixed inset-0 z-50 bg-slate-950/70 lg:hidden"><div className="h-screen w-72">{content}</div></div> : null}
    </>
  );
}
