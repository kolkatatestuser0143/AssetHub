'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Download, Filter, RefreshCw, Search, ShieldCheck, X, XCircle } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type Event = {
  id: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  result?: string | null;
  method?: string | null;
  route?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  requestId?: string | null;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

const formatAction = (action: string) => action.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const isFailure = (event: Event) => event.result === 'failure' || Number(event.statusCode) >= 400 || event.action.endsWith('.failed');

export default function SystemAuditPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('all');
  const [target, setTarget] = useState('all');
  const [selected, setSelected] = useState<Event | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await systemFetch('/system/audit');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load audit data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const targetTypes = useMemo(() => Array.from(new Set(items.map((e) => e.resourceType).filter(Boolean))).sort(), [items]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((event) => {
      const matchesQuery = !needle || [event.action, event.resourceType, event.resourceId, event.actorUserId, event.tenantId, event.ipAddress, event.requestId, event.route]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      const matchesResult = result === 'all' || (result === 'failed' ? isFailure(event) : !isFailure(event));
      const matchesTarget = target === 'all' || event.resourceType === target;
      return matchesQuery && matchesResult && matchesTarget;
    });
  }, [items, query, result, target]);

  const failed = items.filter(isFailure).length;
  const successful = items.length - failed;
  const uniqueIps = new Set(items.map((e) => e.ipAddress).filter(Boolean)).size;
  const recentFailures = items.filter(isFailure).slice(0, 5);

  function exportCsv() {
    const header = ['occurredAt', 'action', 'targetType', 'targetId', 'actorUserId', 'tenantId', 'statusCode', 'ipAddress', 'requestId'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((e) => [e.occurredAt, e.action, e.resourceType, e.resourceId, e.actorUserId, e.tenantId, e.statusCode, e.ipAddress, e.requestId].map(escape).join(','));
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `assethub-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Security center</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Audit & Security</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Investigate platform activity, failed operations and administrative changes without leaving the System Admin console.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} disabled={!filtered.length} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16}/>Export CSV</button>
          <button onClick={() => void load()} disabled={loading} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button>
        </div>
      </header>

      {error && <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ShieldCheck size={18}/>} label="Recorded events" value={items.length} hint="Latest platform activity" />
        <Metric icon={<CheckCircle2 size={18}/>} label="Successful" value={successful} hint="Requests without failure signals" />
        <Metric icon={<AlertTriangle size={18}/>} label="Failure signals" value={failed} hint={failed ? 'Review recent failures' : 'No failures in loaded events'} danger={failed > 0} />
        <Metric icon={<ShieldCheck size={18}/>} label="Source IPs" value={uniqueIps} hint="Unique addresses in loaded events" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action, tenant, actor, request ID, IP…" className="field h-11 w-full pl-9" aria-label="Search audit events"/></div>
          <div className="flex flex-wrap items-center gap-2"><Filter size={16} className="text-slate-400"/>
            <select value={result} onChange={(e) => setResult(e.target.value)} className="field h-11 min-w-32"><option value="all">All results</option><option value="success">Successful</option><option value="failed">Failures</option></select>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="field h-11 min-w-36"><option value="all">All resources</option>{targetTypes.map((type) => <option key={type} value={type!}>{type}</option>)}</select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Showing {filtered.length} of {items.length} events</span>{(query || result !== 'all' || target !== 'all') && <button onClick={() => { setQuery(''); setResult('all'); setTarget('all'); }} className="font-semibold text-[var(--theme-link)]">Clear filters</button>}</div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-950">Activity timeline</h3><p className="mt-1 text-xs text-slate-500">Newest events appear first.</p></div></div></div>
        {loading ? <div className="space-y-3 p-5">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100"/>)}</div> : filtered.length === 0 ? <div className="p-14 text-center"><ShieldCheck size={36} className="mx-auto text-slate-300"/><p className="mt-4 font-semibold text-slate-800">No matching audit events</p><p className="mt-1 text-sm text-slate-500">Try clearing the filters or perform an administrative action.</p></div> : <div className="divide-y divide-slate-100">{filtered.map((event) => <button key={event.id} onClick={() => setSelected(event)} className="ui-interactive block w-full text-left"><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_220px] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isFailure(event) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{isFailure(event) ? <XCircle size={16}/> : <CheckCircle2 size={16}/>}</span><p className="truncate font-semibold text-slate-950">{formatAction(event.action)}</p></div><p className="mt-2 truncate pl-10 text-xs text-slate-500">{event.resourceType ?? 'platform'}{event.resourceId ? ` · ${event.resourceId}` : ''}</p></div><div className="text-xs text-slate-500"><p>Actor <span className="font-medium text-slate-700">{event.actorUserId ?? 'system'}</span></p><p className="mt-1">Tenant <span className="font-medium text-slate-700">{event.tenantId ?? 'platform'}</span></p></div><div className="text-xs text-slate-500 lg:text-right"><p>{event.method ?? ''} {event.route ?? ''}</p><p className="mt-1">{event.statusCode ?? '—'} · {new Date(event.occurredAt).toLocaleString()}</p></div></div></button>)}</div>}
      </section>

      {recentFailures.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 text-amber-600" size={18}/><div><h3 className="font-semibold text-amber-950">Recent failure signals</h3><p className="mt-1 text-sm text-amber-800">These events are worth reviewing. They are derived from the currently loaded audit stream.</p><div className="mt-3 flex flex-wrap gap-2">{recentFailures.map((event) => <button key={event.id} onClick={() => setSelected(event)} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">{formatAction(event.action)}</button>)}</div></div></div></section>}

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-link)]">Audit event</p><h3 className="mt-1 text-xl font-bold text-slate-950">{formatAction(selected.action)}</h3></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={18}/></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">{[['Result', isFailure(selected) ? 'Failure' : 'Success'], ['Occurred', new Date(selected.occurredAt).toLocaleString()], ['Actor', selected.actorUserId ?? 'system'], ['Tenant', selected.tenantId ?? 'platform'], ['Resource', `${selected.resourceType ?? 'platform'}${selected.resourceId ? ` · ${selected.resourceId}` : ''}`], ['Status', selected.statusCode ?? '—'], ['IP address', selected.ipAddress ?? '—'], ['Request ID', selected.requestId ?? '—']].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-all text-sm font-medium text-slate-800">{value}</p></div>)}</div>{selected.metadata && <div className="px-5 pb-5"><div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100"><div className="mb-2 flex items-center justify-between"><span className="font-semibold">Metadata</span><button onClick={() => navigator.clipboard?.writeText(JSON.stringify(selected.metadata, null, 2))} className="inline-flex items-center gap-1 text-slate-300 hover:text-white"><Clipboard size={13}/>Copy</button></div><pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(selected.metadata, null, 2)}</pre></div></div>}</div></div>}
    </div>
  );
}

function Metric({ icon, label, value, hint, danger = false }: { icon: React.ReactNode; label: string; value: number; hint: string; danger?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`grid h-10 w-10 place-items-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>{icon}</div><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>;
}
