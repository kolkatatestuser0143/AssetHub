'use client';

import { permissionMeta } from '../../../../components/rbac/PermissionPresentation';

export default function Phase3SummaryPage(){
  const sample=['platform:tenants:manage','platform:users:manage','platform:roles:read'];
  return <main className="mx-auto max-w-4xl space-y-5 py-10"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Central access presentation</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Roles and capabilities</h1><p className="mt-2 text-sm text-slate-500">Technical permission keys are translated into administrator-friendly capability names.</p></div><section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap gap-2">{sample.map((key)=><span key={key} title={key} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">{permissionMeta(key).label}</span>)}</div></section></main>;
}
