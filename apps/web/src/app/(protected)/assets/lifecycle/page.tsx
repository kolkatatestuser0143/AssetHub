'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, Clock3, History, RefreshCw, Search, Wrench } from 'lucide-react';
import { apiFetch } from '../../../../../lib/api-client';
import { StatusBadge } from '../../../../../components/ui';

type Asset = {
  id: string;
  assetNumber: string;
  status: string;
  createdAt?: string;
  assetType?: { name: string };
};

type PageResponse = {
  items: Asset[];
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
};

const STATES = ['IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'LOST_STOLEN', 'RETIRED', 'DISPOSED'];
const ATTENTION = new Set(['IN_REPAIR', 'LOST_STOLEN']);
const TERMINAL = new Set(['LOST_STOLEN', 'RETIRED', 'DISPOSED']);

const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function AssetLifecyclePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(true);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100', sortBy: 'createdAt', sortDir: 'desc' });
      if (filter !== 'ALL') params.set('status', filter);
      if (query.trim()) params.set('q', query.trim());
      const data: PageResponse = await apiFetch(`/assets?${params}`);
      setAssets(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.pagination?.total ?? data?.items?.length ?? 0));
    } catch (e: any) {
      setError(e?.message || 'Unable to load asset lifecycle operations.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [query, filter]);

  async function transition(asset: Asset, toState: string) {
    if (TERMINAL.has(toState) && !window.confirm(`Move ${asset.assetNumber} to ${label(toState)}? This is a sensitive lifecycle action.`)) return;
    setTransitioning(asset.id);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/assets/${asset.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toState, reason: `Lifecycle operations: ${label(toState)}` }),
      });
      setMessage(`${asset.assetNumber} moved to ${label(toState)}.`);
      await load();
    } catch (e: any) {
      setError(e?.message || `Unable to move ${asset.assetNumber}.`);
    } finally {
      setTransitioning(null);
    }
  }

  const counts = useMemo(() => assets.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.status] = (acc[asset.status] || 0) + 1;
    return acc;
  }, {}), [assets]);

  const attention = assets.filter((asset) => ATTENTION.has(asset.status));
  const active = assets.filter((asset) => asset.status === 'ASSIGNED');
  const ready = assets.filter((asset) => asset.status === 'IN_STOCK');

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Asset lifecycle</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Control asset state changes from one operational workspace. Assignment and acknowledgement remain part of custody, while lifecycle state stays with the asset.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets" className="ui-interactive rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">Inventory</Link>
          <Link href="/assets/transfers" className="ui-interactive rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">Transfers</Link>
          <button onClick={() => void load()} disabled={busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total tracked', total, Boxes, 'Across the current operational inventory'],
          ['Ready to issue', counts.IN_STOCK || 0, CheckCircle2, 'Assets currently in stock'],
          ['Active custody', counts.ASSIGNED || 0, Clock3, 'Assets assigned to employees'],
          ['Needs attention', (counts.IN_REPAIR || 0) + (counts.LOST_STOLEN || 0), AlertTriangle, 'Repair or lost/stolen states'],
        ].map(([title, value, Icon, hint]) => (
          <div key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p><Icon size={18} className="text-[var(--theme-link)]"/></div>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} className="field h-11 pl-9" placeholder="Find an asset by number, type or status" aria-label="Search lifecycle assets"/></div>
          <div className="flex flex-wrap gap-2">
            {['ALL', ...STATES].map((state) => <button key={state} onClick={() => setFilter(state)} className={`ui-interactive rounded-xl border px-3 py-2 text-xs font-semibold ${filter === state ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-soft)] text-[var(--theme-link)]' : 'border-slate-200 bg-white text-slate-600'}`}>{state === 'ALL' ? 'All' : label(state)} <span className="ml-1 opacity-60">{state === 'ALL' ? total : counts[state] || 0}</span></button>)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"><div className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 size={18}/>Ready to issue</div><p className="mt-1 text-sm text-emerald-800">In-stock assets are ready for IT/admin custody assignment.</p><p className="mt-4 text-3xl font-bold text-emerald-950">{ready.length}</p></div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5"><div className="flex items-center gap-2 font-semibold text-blue-900"><Clock3 size={18}/>Active custody</div><p className="mt-1 text-sm text-blue-800">Assigned assets stay here until returned or transferred.</p><p className="mt-4 text-3xl font-bold text-blue-950">{active.length}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5"><div className="flex items-center gap-2 font-semibold text-amber-900"><Wrench size={18}/>Attention queue</div><p className="mt-1 text-sm text-amber-800">Repair and lost/stolen assets require operational follow-up.</p><p className="mt-4 text-3xl font-bold text-amber-950">{attention.length}</p></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-950">Lifecycle operations</h2><p className="mt-1 text-sm text-slate-500">Use state changes only for the asset lifecycle. Use Assignments and Transfers for custody changes.</p></div>
        {busy ? <div className="space-y-3 p-5">{[1,2,3,4,5].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100"/>)}</div> : assets.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><Boxes size={28}/></div><p className="mt-4 font-semibold text-slate-900">No assets in this operational view</p><p className="mt-1 text-sm text-slate-500">Try another lifecycle state or clear the search.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Current state</th><th className="px-5 py-3">Next operational state</th><th className="px-5 py-3 text-right">Open</th></tr></thead><tbody className="divide-y divide-slate-100">{assets.map((asset) => <tr key={asset.id} className="hover:bg-[var(--theme-primary-soft)]/40"><td className="px-5 py-4"><Link href={`/assets/${asset.id}`} className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{asset.assetNumber}</Link><p className="mt-1 font-mono text-[11px] text-slate-400">{asset.id}</p></td><td className="px-5 py-4 text-slate-600">{asset.assetType?.name || '—'}</td><td className="px-5 py-4"><StatusBadge status={asset.status}/></td><td className="px-5 py-4"><select disabled={transitioning === asset.id} defaultValue="" onChange={(e) => { const next = e.target.value; e.currentTarget.value = ''; if (next) void transition(asset, next); }} className="field h-9 min-w-48 text-xs" aria-label={`Change lifecycle for ${asset.assetNumber}`}><option value="">Choose transition…</option>{STATES.filter((state) => state !== asset.status).map((state) => <option key={state} value={state}>{label(state)}</option>)}</select></td><td className="px-5 py-4 text-right"><Link href={`/assets/${asset.id}`} className="ui-interactive inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-link)]">Asset 360 <ArrowRight size={14}/></Link></td></tr>)}</tbody></table></div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold text-slate-950"><History size={18} className="text-[var(--theme-link)]"/>Operational boundaries</div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Lifecycle</p><p className="mt-1 text-sm text-slate-500">State of the asset itself: stock, repair, lost, retired or disposed.</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Custody</p><p className="mt-1 text-sm text-slate-500">Who has the asset. Managed through assignment, acknowledgement, return and transfer.</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Audit trail</p><p className="mt-1 text-sm text-slate-500">Every operational transition should remain visible through Asset 360 history.</p></div></div></section>
    </div>
  );
}
