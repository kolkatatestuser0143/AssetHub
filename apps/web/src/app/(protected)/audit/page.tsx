'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, FileSearch, Filter, RefreshCw, ShieldCheck, X, XCircle } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type AuditEvent = {
  id: string;
  occurredAt: string;
  action: string;
  targetType?: string;
  targetId?: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
};

type AuditSummary = {
  total: number;
  today: number;
  topActions: { action: string; count: number }[];
  byTargetType: { targetType: string; count: number }[];
};

const PAGE_SIZE = 25;
const formatLabel = (value?: string | null) => (value ? value.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');
const isFailure = (event: AuditEvent) => event.action.endsWith('.failed') || String(event.metadata?.result ?? '').toLowerCase() === 'failure';
const actorLabel = (event: AuditEvent) => event.actorUserId ? `User ${event.actorUserId.slice(-6)}` : 'System';

function csvDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('ALL');
  const [targetType, setTargetType] = useState('ALL');
  const [result, setResult] = useState('ALL');
  const [datePreset, setDatePreset] = useState('30');
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [eventData, summaryData] = await Promise.all([
        apiFetch('/audit?limit=1000'),
        apiFetch('/audit/summary'),
      ]);
      setEvents(Array.isArray(eventData) ? eventData : []);
      setSummary(summaryData ?? null);
      setPage(1);
    } catch {
      setError('We couldn’t load the audit activity. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const result = await apiFetch('/audit/export.csv');
      csvDownload(result?.filename ?? 'assethub-audit.csv', result?.csv ?? '');
    } catch {
      setError('We couldn’t export the audit activity. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const actions = useMemo(() => Array.from(new Set(events.map((event) => event.action).filter(Boolean))).sort(), [events]);
  const targetTypes = useMemo(() => Array.from(new Set(events.map((event) => event.targetType).filter(Boolean) as string[])).sort(), [events]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = Date.now();
    const cutoff = datePreset === 'all' ? 0 : now - Number(datePreset) * 24 * 60 * 60 * 1000;
    return events.filter((event) => {
      const text = [event.action, event.targetType, event.targetId, event.actorUserId].filter(Boolean).join(' ').toLowerCase();
      const failure = isFailure(event);
      return (!term || text.includes(term))
        && (action === 'ALL' || event.action === action)
        && (targetType === 'ALL' || event.targetType === targetType)
        && (result === 'ALL' || (result === 'FAILED' ? failure : !failure))
        && (!cutoff || new Date(event.occurredAt).getTime() >= cutoff);
    });
  }, [events, query, action, targetType, result, datePreset]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageEvents = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const failedCount = events.filter(isFailure).length;
  const clearFilters = () => { setQuery(''); setAction('ALL'); setTargetType('ALL'); setResult('ALL'); setDatePreset('30'); setPage(1); };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Security & compliance</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Audit logs</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Investigate changes, administrative actions, and security events across your tenant without exposing internal service details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button>
          <button onClick={() => void exportCsv()} disabled={exporting || !events.length} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"><Download size={16}/>{exporting ? 'Exporting…' : 'Export CSV'}</button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total events" value={summary?.total ?? 0} hint="Recorded for your tenant" />
        <Metric label="Today" value={summary?.today ?? 0} hint="Events since midnight" />
        <Metric label="Failure signals" value={failedCount} hint={failedCount ? 'Review recent failures' : 'No failures loaded'} danger={failedCount > 0} />
        <Metric label="Resource types" value={summary?.byTargetType.length ?? 0} hint="Assets, users, organization and more" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Filter size={16}/> Filters</div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search activity, actor, resource…" className="field h-10" aria-label="Search audit activity"/>
          <select value={datePreset} onChange={(e) => { setDatePreset(e.target.value); setPage(1); }} className="field h-10"><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All available</option></select>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="field h-10"><option value="ALL">All actions</option>{actions.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select>
          <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }} className="field h-10"><option value="ALL">All resources</option>{targetTypes.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select>
          <select value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }} className="field h-10"><option value="ALL">All results</option><option value="SUCCESS">Successful</option><option value="FAILED">Failures</option></select>
          <button onClick={clearFilters} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</button>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</span><span>Newest first</span></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--theme-link)]"/><div><h2 className="font-semibold text-slate-950">Activity</h2><p className="mt-1 text-xs text-slate-500">Select an event to inspect its details.</p></div></div></div>
        {busy ? <div className="space-y-3 p-5">{[1,2,3,4,5,6].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : pageEvents.length === 0 ? <div className="p-16 text-center"><FileSearch size={40} className="mx-auto text-slate-300"/><p className="mt-4 font-semibold text-slate-800">No matching audit events</p><p className="mt-1 text-sm text-slate-500">Try another date range or clear the filters.</p></div> : <div className="divide-y divide-slate-100">{pageEvents.map((event) => { const failure = isFailure(event); return <button key={event.id} onClick={() => setSelected(event)} className="ui-interactive block w-full text-left"><div className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_180px_28px] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${failure ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{failure ? <XCircle size={17}/> : <ShieldCheck size={17}/>}</span><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{formatLabel(event.action)}</p><p className="mt-1 truncate text-xs text-slate-500">{formatLabel(event.targetType)}{event.targetId ? ` · ${event.targetId.slice(-8)}` : ''}</p></div></div></div><div className="text-xs text-slate-500"><p>Actor <span className="font-medium text-slate-700">{actorLabel(event)}</span></p><p className="mt-1">Result <span className={`font-semibold ${failure ? 'text-red-600' : 'text-emerald-600'}`}>{failure ? 'Needs review' : 'Successful'}</span></p></div><div className="text-xs text-slate-500 lg:text-right"><p>{new Date(event.occurredAt).toLocaleString()}</p><p className="mt-1">{formatLabel(event.targetType)}</p></div><span className="text-lg text-slate-300">›</span></div></button>; })}</div>}
        {!busy && pageCount > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-xs text-slate-500">Page {currentPage} of {pageCount}</p><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={16}/></button><button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={16}/></button></div></div>}
      </section>

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-link)]">Audit event</p><h3 className="mt-1 text-xl font-bold text-slate-950">{formatLabel(selected.action)}</h3></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18}/></button></div><div className="max-h-[calc(90vh-88px)] overflow-y-auto p-5"><div className="grid gap-3 sm:grid-cols-2">{[['Result', isFailure(selected) ? 'Needs review' : 'Successful'], ['Occurred', new Date(selected.occurredAt).toLocaleString()], ['Actor', actorLabel(selected)], ['Resource', formatLabel(selected.targetType)], ['Reference', selected.targetId ? `…${selected.targetId.slice(-8)}` : 'Not available']].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-all text-sm font-medium text-slate-800">{value}</p></div>)}</div><div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Activity details</p><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">{JSON.stringify(selected.metadata ?? {}, null, 2)}</pre></div></div></div></div>}
    </div>
  );
}

function Metric({ label, value, hint, danger = false }: { label: string; value: number; hint: string; danger?: boolean }) {
  return <div className={`rounded-2xl border bg-white p-5 shadow-sm ${danger ? 'border-red-200' : 'border-slate-200'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold tracking-tight ${danger ? 'text-red-700' : 'text-slate-950'}`}>{value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>;
}
