'use client';

import { ShieldCheck } from 'lucide-react';
import { permissionMeta } from './PermissionPresentation';

export type PresentableRole = {
  id: string;
  name?: string | null;
  description?: string | null;
  isSystem?: boolean;
  permissions?: Array<{ permissionKey?: string | null; key?: string | null }>;
};

export function roleLabel(role: PresentableRole | null | undefined) {
  if (!role) return 'Unknown role';
  return role.name?.trim() || 'Unnamed role';
}

export function RoleChip({ role, tone = 'brand' }: { role: PresentableRole; tone?: 'brand' | 'neutral' | 'success' }) {
  const classes = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : tone === 'neutral'
      ? 'border-slate-200 bg-slate-50 text-slate-700'
      : 'border-violet-200 bg-violet-50 text-violet-700';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`} title={role.description ?? undefined}>
    <ShieldCheck size={12} />{roleLabel(role)}
  </span>;
}

export function EffectivePermissionsSummary({ permissions, limit = 8 }: { permissions: string[]; limit?: number }) {
  const unique = [...new Set(permissions)];
  return <div className="flex flex-wrap gap-2">
    {unique.slice(0, limit).map((key) => {
      const meta = permissionMeta(key);
      return <span key={key} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700" title={key}>{meta.label}</span>;
    })}
    {unique.length > limit && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">+{unique.length - limit} more</span>}
  </div>;
}
