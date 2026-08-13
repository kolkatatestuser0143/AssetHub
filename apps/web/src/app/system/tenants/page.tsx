import Link from 'next/link';

export default function SystemTenantsPage() {
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Platform</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Tenants</h2><p className="mt-2 text-sm text-slate-500">Manage customer environments from the platform console.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h3 className="font-semibold text-slate-950">Tenant management API required</h3><p className="mt-2 text-sm leading-6 text-slate-500">The current API does not expose a platform tenant-management controller yet, so no tenant data is fabricated here.</p><Link href="/system" className="mt-5 inline-flex text-sm font-semibold text-blue-600">Back to overview</Link></div></div>;
}
