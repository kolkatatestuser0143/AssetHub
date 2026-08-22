'use client';

import { KeyRound, ShieldCheck } from 'lucide-react';
import { permissionMeta } from './PermissionPresentation';

export function Phase3Summary({ roleNames, permissionKeys }: { roleNames: string[]; permissionKeys: string[] }) {
  const permissions = [...new Set(permissionKeys)];
  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned roles</p><div className="mt-2 flex flex-wrap gap-2">{roleNames.length ? roleNames.map((r) => <span key={r} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"><ShieldCheck className="mr-1 inline" size={12}/>{r}</span>) : <span className="text-sm text-slate-500">No roles assigned</span>}</div></div>
    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Effective capabilities</p><div className="mt-2 flex flex-wrap gap-2">{permissions.length ? permissions.slice(0, 10).map((p) => <span key={p} title={p} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"><KeyRound className="mr-1 inline" size={12}/>{permissionMeta(p).label}</span>) : <span className="text-sm text-slate-500">No effective permissions</span>}{permissions.length > 10 && <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">+{permissions.length - 10} more</span>}</div></div>
  </div>;
}
