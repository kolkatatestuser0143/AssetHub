'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, ExternalLink, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Warranty = {
  id: string;
  assetId: string;
  provider?: string;
  expiresAt?: string;
  asset?: { id: string; assetNumber: string; status: string } | null;
};

function warrantyState(expiresAt?: string) {
  if (!expiresAt) return { label: 'No expiry', className: 'bg-slate-100 text-slate-600' };
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Expired', className: 'bg-red-50 text-red-700' };
  if (days <= 30) return { label: `${days}d left`, className: 'bg-amber-50 text-amber-700' };
  return { label: 'Active', className: 'bg-emerald-50 text-emerald-700' };
}

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/assets/warranties');
      setWarranties(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load warranties.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => warranties.filter((warranty) => `${warranty.asset?.assetNumber ?? warranty.assetId} ${warranty.provider ?? ''}`.toLowerCase().includes(query.toLowerCase())), [warranties, query]);

  const expired = warranties.filter((item) => warrantyState(item.expiresAt).label === 'Expired').length;
  const expiring = warranties.filter((item) => { const label = warrantyState(item.expiresAt).label; return label.endsWith('d left') && Number.parseInt(label, 10) <= 30; }).length;

  return (
    <div className="mx-auto max-w-[1250px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Asset support</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Warranties</h1><p className="mt-2 text-sm text-slate-500">Monitor coverage, expiry risk, and jump directly into asset warranty details.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Tracked warranties</p><p className="mt-2 text-2xl font-bold text-slate-950">{warranties.length}</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm text-amber-800">Expiring soon</p><p className="mt-2 text-2xl font-bold text-amber-950">{expiring}</p></div><div className="rounded-2xl border border-red-200 bg-red-50 p-5"><p className="text-sm text-red-700">Expired</p><p className="mt-2 text-2xl font-bold text-red-950">{expired}</p></div></div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset or warranty provider" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></div><span className="text-xs text-slate-500">{filtered.length} warranties</span></div>
        {loading ? <div className="space-y-3 p-5">{[1,2,3,4].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : filtered.length === 0 ? <div className="p-14 text-center"><ShieldCheck className="mx-auto text-slate-300" size={36}/><p className="mt-3 font-semibold text-slate-800">No warranties found</p><p className="mt-1 text-sm text-slate-500">Add warranty coverage from an asset detail page.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">State</th><th className="px-5 py-3 text-right" /></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((warranty) => { const state = warrantyState(warranty.expiresAt); return <tr key={warranty.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/assets/${warranty.assetId}`} className="font-semibold text-slate-900 hover:text-blue-600">{warranty.asset?.assetNumber ?? warranty.assetId}</Link></td><td className="px-5 py-4 text-slate-700">{warranty.provider || '—'}</td><td className="px-5 py-4 text-slate-700">{warranty.expiresAt ? new Date(warranty.expiresAt).toLocaleDateString() : '—'}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${state.className}`}><CalendarClock size={12}/>{state.label}</span></td><td className="px-5 py-4 text-right"><Link href={`/assets/${warranty.assetId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Open asset<ExternalLink size={13}/></Link></td></tr>; })}</tbody></table></div>}
      </section>
    </div>
  );
}
