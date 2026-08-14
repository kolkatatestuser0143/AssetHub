'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileSearch, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
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
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [eventData, summaryData] = await Promise.all([
        apiFetch('/audit?limit=500'),
        apiFetch('/audit/summary'),
      ]);
      setEvents(Array.isArray(eventData) ? eventData : []);
      setSummary(summaryData ?? null);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load audit events.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const result = await apiFetch('/audit/export.csv');
      csvDownload(result?.filename ?? 'assethub-audit.csv', result?.csv ?? '');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to export audit events.');
    } finally {
      setExporting(false);
    }
  }

  const actions = useMemo(
    () => Array.from(new Set(events.map((event) => event.action).filter(Boolean))).sort(),
    [events],
  );

  const targetTypes = useMemo(
    () => Array.from(new Set(events.map((event) => event.targetType).filter(Boolean) as string[])).sort(),
    [events],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      const text = [
        event.action,
        event.targetType,
        event.targetId,
        event.actorUserId,
      ].filter(Boolean).join(' ').toLowerCase();

      return (!term || text.includes(term))
        && (action === 'ALL' || event.action === action)
        && (targetType === 'ALL' || event.targetType === targetType);
    });
  }, [events, query, action, targetType]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Security & compliance</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Audit logs</h1>
          <p className="mt-2 text-sm text-slate-500">Review tenant activity, security-relevant changes, and operational events from the immutable audit stream.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button>
          <button onClick={exportCsv} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"><Download size={16}/>{exporting ? 'Exporting…' : 'Export CSV'}</button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Events</p><p className="mt-2 text-2xl font-bold text-slate-950">{summary?.total ?? '—'}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today</p><p className="mt-2 text-2xl font-bold text-slate-950">{summary?.today ?? '—'}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action types</p><p className="mt-2 text-2xl font-bold text-slate-950">{summary?.topActions.length ?? '—'}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600"/><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Coverage</p></div><p className="mt-2 text-sm font-semibold text-emerald-800">Tenant-scoped audit visibility</p></div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action, actor, target…" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></div>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All actions</option>{actions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All resources</option>{targetTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <div className="flex items-center justify-end text-xs text-slate-500">{filtered.length} of {events.length}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {busy ? <div className="space-y-3 p-5">{[1,2,3,4,5,6].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div> : filtered.length === 0 ? (
          <div className="p-16 text-center"><FileSearch size={40} className="mx-auto text-slate-300"/><p className="mt-4 font-semibold text-slate-800">No audit events found</p><p className="mt-1 text-sm text-slate-500">Adjust your search or wait for events to be generated.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Target ID</th><th className="px-5 py-3"/></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((event) => <tr key={event.id} className="hover:bg-slate-50"><td className="px-5 py-4 text-slate-600">{new Date(event.occurredAt).toLocaleString()}</td><td className="px-5 py-4 font-mono text-xs text-slate-600">{event.actorUserId ?? 'system'}</td><td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{event.action}</span></td><td className="px-5 py-4 text-slate-700">{event.targetType ?? '—'}</td><td className="px-5 py-4 font-mono text-xs text-slate-500">{event.targetId ?? '—'}</td><td className="px-5 py-4 text-right"><button onClick={() => setSelected(event)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Details</button></td></tr>)}</tbody></table></div>
        )}
      </section>

      {(summary?.topActions.length || summary?.byTargetType.length) && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Top actions</h2><div className="mt-4 space-y-3">{summary?.topActions.slice(0,8).map((row) => <div key={row.action} className="flex items-center justify-between text-sm"><span className="text-slate-600">{row.action}</span><span className="font-semibold text-slate-900">{row.count}</span></div>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Resources</h2><div className="mt-4 space-y-3">{summary?.byTargetType.map((row) => <div key={row.targetType} className="flex items-center justify-between text-sm"><span className="text-slate-600">{row.targetType}</span><span className="font-semibold text-slate-900">{row.count}</span></div>)}</div></section>
        </div>
      )}

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-4 sm:items-center"><div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Audit event</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{selected.action}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Event ID</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{selected.id}</p></div><div><p className="text-xs text-slate-500">Occurred</p><p className="mt-1 text-sm text-slate-800">{new Date(selected.occurredAt).toLocaleString()}</p></div><div><p className="text-xs text-slate-500">Actor</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{selected.actorUserId ?? 'system'}</p></div><div><p className="text-xs text-slate-500">Target</p><p className="mt-1 text-sm text-slate-800">{selected.targetType ?? '—'} / {selected.targetId ?? '—'}</p></div><div className="sm:col-span-2"><p className="text-xs text-slate-500">Metadata</p><pre className="mt-1 max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(selected.metadata ?? {}, null, 2)}</pre></div></div></div></div>}
    </div>
  );
}
