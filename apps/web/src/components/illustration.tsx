'use client';

import {
  Archive,
  Bell,
  Building2,
  FileSearch,
  HardDrive,
  KeyRound,
  MapPin,
  RefreshCw,
  SearchX,
  Shield,
  ShieldAlert,
  Users,
  ArrowLeftRight,
} from 'lucide-react';
import type { ReactNode } from 'react';

type IllustrationName =
  | 'assets'
  | 'assignments'
  | 'transfers'
  | 'employees'
  | 'companies'
  | 'locations'
  | 'roles'
  | 'identity'
  | 'notifications'
  | 'reports'
  | 'search'
  | 'archive'
  | 'error'
  | 'offline';

const icons: Record<IllustrationName, ReactNode> = {
  assets: <HardDrive />,
  assignments: <Users />,
  transfers: <ArrowLeftRight />,
  employees: <Users />,
  companies: <Building2 />,
  locations: <MapPin />,
  roles: <KeyRound />,
  identity: <Shield />,
  notifications: <Bell />,
  reports: <FileSearch />,
  search: <SearchX />,
  archive: <Archive />,
  error: <ShieldAlert />,
  offline: <RefreshCw />,
};

const toneClasses: Record<'brand' | 'success' | 'warning' | 'danger' | 'neutral', string> = {
  brand: 'bg-[var(--theme-primary-soft)] text-[var(--theme-primary)] ring-[color-mix(in_srgb,var(--theme-primary)_18%,transparent)]',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function Illustration({ name, tone = 'brand', size = 'md', label }: {
  name: IllustrationName;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const sizeClass = size === 'sm' ? 'h-11 w-11' : size === 'lg' ? 'h-24 w-24' : 'h-16 w-16';
  const iconClass = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-10 w-10' : 'h-7 w-7';
  return (
    <div className={`illustration-shell relative grid place-items-center rounded-[1.4rem] ring-1 ${sizeClass} ${toneClasses[tone]}`} aria-hidden={label ? undefined : true} aria-label={label}>
      <span className="absolute inset-2 rounded-[1rem] border border-current/10 opacity-70" />
      <span className={`relative ${iconClass}`}>{icons[name]}</span>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white/90 shadow-sm ring-1 ring-black/5" />
    </div>
  );
}
