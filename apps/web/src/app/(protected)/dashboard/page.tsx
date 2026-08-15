'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, Boxes, Building2, Laptop, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Row = { id: string; status: string };

export default function DashboardPage() {
  const [assets, setAssets] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<unknown[]>([]);
  const [types, setTypes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiFetch('/assets'), apiFetch('/companies'), apiFetch('/assets/types')])
      .then(([a, c, t]) => { setAssets(Array.isArray(a) ? a : []); setCompanies(Array.isArray(c) ? c : []); setTypes(Array.isArray(t) ? t : []); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const assigned = assets.filter((a) => a.status === 'ASSIGNED').length;
  const stats = [['Assets', assets.length, Laptop], ['Companies', companies.length, Building2], ['Asset types', types.length, Boxes], ['Assigned', assigned, ShieldCheck]] as const;

  return <div className="space-y-7"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">IT environment overview</h1><p className="mt-2 text-sm text-slate-500">Live data from the current tenant.</p></div>{error&&<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label,value,Icon])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p>{loading?<div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-slate-100" aria-hidden="true"/>:<p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>}</div>{loading?<div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" aria-hidden="true"/>:<div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={20}/></div>}</div></div>)}</div><div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><Activity size={19} className="text-blue-600"/><h2 className="font-semibold text-slate-900">Asset lifecycle</h2></div>{loading?<div className="mt-6 space-y-3" role="status" aria-label="Loading asset lifecycle"><div className="h-11 animate-pulse rounded-xl bg-slate-100"/><div className="h-11 animate-pulse rounded-xl bg-slate-100"/><div className="h-11 animate-pulse rounded-xl bg-slate-100"/></div>:assets.length===0?<div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No asset data yet.</div>:<div className="mt-6 space-y-2">{Object.entries(assets.reduce<Record<string,number>>((m,a)=>(m[a.status]=(m[a.status]??0)+1,m),{})).map(([s,n])=><div key={s} className="flex justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm"><span>{s}</span><span className="font-semibold">{n}</span></div>)}</div>}</section><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Quick actions</h2><div className="mt-4 space-y-2"><Link className="block rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-blue-50 hover:text-blue-700" href="/assets">Manage assets</Link><Link className="block rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-blue-50 hover:text-blue-700" href="/companies">Manage companies</Link><Link className="block rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-blue-50 hover:text-blue-700" href="/roles">Review permissions</Link></div></section></div></div>;
}
