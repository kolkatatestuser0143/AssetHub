'use client';

import Link from 'next/link';
import { Activity, ArrowRight, Building2, FileSearch, Settings, ShieldCheck, Users } from 'lucide-react';

const modules = [
  ['Tenants', '/system/tenants', Building2, 'Tenant provisioning and environment lifecycle'],
  ['Platform users', '/system/users', Users, 'Manage system administrators and access'],
  ['Roles & permissions', '/system/roles', ShieldCheck, 'Review platform RBAC configuration'],
  ['Audit & security', '/system/audit', FileSearch, 'Security and administrative event review'],
  ['System health', '/system/health', Activity, 'Infrastructure and service health workspace'],
  ['Platform settings', '/system/settings', Settings, 'Platform-wide configuration'],
] as const;

export default function SystemDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Platform control center</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">System overview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage the AssetHub platform from one administrative workspace. Metrics are intentionally omitted until the corresponding platform APIs are available.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map(([label, href, Icon, description]) => (
          <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={19} /></span>
              <ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
            </div>
            <h2 className="mt-4 font-semibold text-slate-950">{label}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><Activity size={18} /></div>
          <div>
            <h2 className="font-semibold text-amber-950">Platform APIs still being completed</h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">The console will surface live tenant, billing, security, and health metrics as those backend endpoints are introduced. This dashboard never substitutes fabricated production numbers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
