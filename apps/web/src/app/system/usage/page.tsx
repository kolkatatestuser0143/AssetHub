'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type Quota = { usage: number; limit: number | null; percent: number | null; severity: string };
type UsageRow = {
  tenant: { id: string; name: string; slug: string };
  subscription: { planId?: string | null; status?: string; endsAt?: string | null } | null;
  usage: Record<string, number>;
  quota: Record<string, Quota>;
};

const labels: Record<string, string> = {
  users: 'Users', assets: 'Assets', companies: 'Companies', businessUnits: 'Business Units',
  plants: 'Plants', locations: 'Locations', departments: 'Departments', vendors: 'Vendors', assetDocuments: 'Asset Documents',
};

const quotaKeys: Record<string, string> = {
  users: 'max_users', assets: 'max_assets', companies: 'max_companies', businessUnits: 'max_business_units',
  plants: 'max_plants', locations: 'max_locations', departments: 'max_departments', vendors: 'max_vendors', assetDocuments: 'max_asset_documents',
};

function severityClass(severity: string) {
  if (severity === 'limit_reached') return 'bg-red-100 text-red-700';
  if (severity === 'critical') return 'bg-orange-100 text-orange-700';
  if (severity === 'warning') return 'bg-amber-100 text-amber-700';
  if (severity === 'unlimited') return 'bg-blue-100 text-blue-700';
  if (severity === 'unavailable') return 'bg-slate-100 text-slate-600';
  return 'bg-emerald-100 text-emerald-700';
}

function severityLabel(severity: string) {
  return severity === 'limit_reached' ? 'Limit reached' : severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Warning' : severity === 'unlimited' ? 'Unlimited' : severity === 'unavailable' ? 'Unavailable' : 'Normal';
}

export default function SystemUsagePage() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { const data = await systemFetch('/system/usage'); setRows(Array.isArray(data?.tenants) ? data.tenants : []); }
    catch (e: any) { setError(e?.message ?? 'Unable to load tenant usage.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => `${row.tenant.name} ${row.tenant.slug}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const totals = useMemo(() => rows.reduce((acc, row) => { Object.entries(row.usage).forEach(([key, value]) => { acc[key] = (acc[key] ?? 0) + value; }); return acc; }, {} as Record<string, number>), [rows]);
  const attention = useMemo(() => rows.filter((row) => Object.values(row.quota ?? {}).some((q) => q.severity === 'warning' || q.severity === 'critical' || q.severity === 'limit_reached')).length, [rows]);

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Licensing</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Tenant Usage</h2><p className="mt-2 text-sm text-slate-500">Live resource counts compared with each tenant's effective license entitlements.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw className="h-4 w-4"/>Refresh</button>
    </header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {['users','assets','companies','assetDocuments'].map((key) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labels[key]}</p><p className="mt-2 text-3xl font-bold text-slate-950">{totals[key] ?? 0}</p></div>)}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tenants needing attention</p><p className="mt-2 text-3xl font-bold text-slate-950">{attention}</p></div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-slate-950">Usage by tenant</h3><p className="mt-1 text-xs text-slate-500">Warning at 80%, critical at 90%, and limit reached at 100% or more.</p></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tenant…" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
      {loading ? <div className="p-5 text-sm text-slate-500">Loading usage…</div> : filtered.length === 0 ? <div className="p-5 text-sm text-slate-500">No tenants found.</div> : <div className="overflow-x-auto"><table className="min-w-[1450px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tenant</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Status</th>{Object.keys(labels).map((key) => <th key={key} className="px-3 py-3 text-right">{labels[key]}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row) => <tr key={row.tenant.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-950">{row.tenant.name}</p><p className="text-xs text-slate-500">{row.tenant.slug}</p></td><td className="px-3 py-4 font-mono text-xs">{row.subscription?.planId ?? '—'}</td><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{row.subscription?.status ?? 'unlicensed'}</span></td>{Object.keys(labels).map((key) => { const q = row.quota?.[quotaKeys[key]]; return <td key={key} className="px-3 py-4 text-right"><div className="font-semibold text-slate-900">{row.usage[key] ?? 0}{q?.limit !== null && q?.limit !== undefined ? ` / ${q.limit}` : ' / ∞'}</div>{q && <span className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${severityClass(q.severity)}`}>{q.percent === null ? severityLabel(q.severity) : `${q.percent}% · ${severityLabel(q.severity)}`}</span>}</td>; })}</tr>)}</tbody></table></div>}
    </section>
  </div>;
}
