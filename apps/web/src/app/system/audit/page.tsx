'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Download, Filter, RefreshCw, ShieldCheck, X, XCircle } from 'lucide-react';
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

const PAGE_SIZE = 25;
const formatLabel = (value?: string | null) => (value ? value.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');
const isFailure = (event: Event) => event.result === 'failure' || Number(event.statusCode) >= 400 || event.action.endsWith('.failed');
const compact = (value?: string | null) => value ? `…${value.slice(-8)}` : '—';

export default function SystemAuditPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('all');
  const [target, setTarget] = useState('all');
  const [action, setAction] = useState('all');
  const [datePreset, setDatePreset] = useState('30');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Event | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await systemFetch('/system/audit');
      setItems(Array.isArray(data) ? data : []);
      setPage(1);
    } catch {
      setError('We couldn’t load system audit activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const actions = useMemo(() => Array.from(new Set(items.map((e) => e.action).filter(Boolean))).sort(), [items]);
  const targetTypes = useMemo(() => Array.from(new Set(items.map((e) => e.resourceType).filter(Boolean) as string[])).sort(), [items]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const cutoff = datePreset === 'all' ? 0 : Date.now() - Number(datePreset) * 24 * 60 * 60 * 1000;
    return items.filter((event) => {
      const matchesQuery = !needle || [event.action, event.resourceType, event.resourceId, event.actorUserId, event.tenantId, event.ipAddress, event.requestId]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      const matchesResult = result === 'all' || (result === 'failed' ? isFailure(event) : !isFailure(event));
      const matchesTarget = target === 'all' || event.resourceType === target;
      const matchesAction = action === 'all' || event.action === action;
      return matchesQuery && matchesResult && matchesTarget && matchesAction && (!cutoff || new Date(event.occurredAt).getTime() >= cutoff);
    });
  }, [items, query, result, target, action, datePreset]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const failed = items.filter(isFailure).length;
  const successful = items.length - failed;
  const uniqueIps = new Set(items.map((e) => e.ipAddress).filter(Boolean)).size;

  function exportCsv() {
    if (!filtered.length) return;
    const header = ['occurredAt', 'action', 'resourceType', 'resourceId', 'actorUserId', 'tenantId', 'statusCode', 'ipAddress', 'requestId'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((e) => [e.occurredAt, e.action, e.resourceType, e.resourceId, e.actorUserId, e.tenantId, e.statusCode, e.ipAddress, e.requestId].map(escape).join(','));
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `assethub-system-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const clearFilters = () => { setQuery(''); setResult('all'); setTarget('all'); setAction('all'); setDatePreset('30'); setPage(1); };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Security center</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Audit & Security</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Investigate platform activity, tenant administration, security events, and failed operations from one controlled workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} disabled={!filtered.length} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"><Download size={16}/>Export CSV</button>
          <button onClick={() => void load()} disabled={loading} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Loaded events" value={items.length} hint="Latest platform activity" />
        <Metric label="Successful" value={successful} hint="No failure signal detected" />
        <Metric label="Failure signals" value={failed} hint={failed ? 'Review recent activity' : 'No failures in loaded events'} danger={failed > 0} />
        <Metric label="Source IPs" value={uniqueIps} hint="Unique addresses in loaded events" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Filter size={16}/>Investigation filters</div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search tenant, actor, request, IP…" className="field h-10" aria-label="Search system audit events"/>
          <select value={datePreset} onChange={(e) => { setDatePreset(e.target.value); setPage(1); }} className="field h-10"><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All available</option></select>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="field h-10"><option value="all">All actions</option>{actions.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select>
          <select value={target} onChange={(e) => { setTarget(e.target.value); setPage(1); }} className="field h-10"><option value="all">All resources</option>{targetTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select>
          <select value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }} className="field h-10"><option value="all">All results</option><option value="success">Successful</option><option value="failed">Failures</option></select>
          <button onClick={clearFilters} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</button>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</span><span>Newest first</span></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--theme-link)]"/><div><h2 className="font-semibold text-slate-950">Platform activity</h2><p className="mt-1 text-xs text-slate-500">Select an event for a deeper security review.</p></div></div></div>
        {loading ? <div className="space-y-3 p-5">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100"/>)}</div> : visible.length === 0 ? <div className="p-14 text-center"><ShieldCheck size={36} className="mx-auto text-slate-300"/><p className="mt-4 font-semibold text-slate-800">No matching audit events</p><p className="mt-1 text-sm text-slate-500">Try clearing filters or use a wider date range.</p></div> : <div className="divide-y divide-slate-100">{visible.map((event) => { const failure = isFailure(event); return <button key={event.id} onClick={() => setSelected(event)} className="ui-interactive block w-full text-left"><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_220px] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${failure ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{failure ? <XCircle size={17}/> : <ShieldCheck size={17}/>}</span><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{formatLabel(event.action)}</p><p className="mt-1 truncate text-xs text-slate-500">{formatLabel(event.resourceType)}{event.resourceId ? ` · ${compact(event.resourceId)}` : ''}</p></div></div></div><div className="text-xs text-slate-500"><p>Tenant <span className="font-medium text-slate-700">{compact(event.tenantId)}</span></p><p className="mt-1">Actor <span className="font-medium text-slate-700">{compact(event.actorUserId)}</span></p></div><div className="text-xs text-slate-500 lg:text-right"><p>{event.statusCode ?? '—'} · {event.method ?? ''}</p><p className="mt-1">{new Date(event.occurredAt).toLocaleString()}</p></div></div></button>; })}</div>}
        {!loading && pageCount > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-xs text-slate-500">Page {currentPage} of {pageCount}</p><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={16}/></button><button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={16}/></button></div></div>}
      </section>

      {failed > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 text-amber-600" size={18}/><div><h3 className="font-semibold text-amber-950">Recent failure signals</h3><p className="mt-1 text-sm text-amber-800">Review failed or denied operations before dismissing them as expected activity.</p></div></div></section>}

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-link)]">Security event</p><h3 className="mt-1 text-xl font-bold text-slate-950">{formatLabel(selected.action)}</h3></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18}/></button></div><div className="max-h-[calc(90vh-88px)] overflow-y-auto p-5"><div className="grid gap-3 sm:grid-cols-2">{[['Result', isFailure(selected) ? 'Failure / review' : 'Successful'], ['Occurred', new Date(selected.occurredAt).toLocaleString()], ['Tenant reference', compact(selected.tenantId)], ['Actor reference', compact(selected.actorUserId)], ['Resource', formatLabel(selected.resourceType)], ['Resource reference', compact(selected.resourceId)], ['Status', selected.statusCode ?? '—'], ['Source address', selected.ipAddress ?? '—'], ['Request reference', compact(selected.requestId)]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-all text-sm font-medium text-slate-800">{value}</p></div>)}</div><div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Event details</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">{JSON.stringify(selected.metadata ?? {}, null, 2)}</pre></div></div></div></div>}
    </div>
  );
}

function Metric({ label, value, hint, danger = false }: { label: string; value: number; hint: string; danger?: boolean }) {
  return <div className={`rounded-2xl border bg-white p-5 shadow-sm ${danger ? 'border-red-200' : 'border-slate-200'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold tracking-tight ${danger ? 'text-red-700' : 'text-slate-950'}`}>{value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>;
}
