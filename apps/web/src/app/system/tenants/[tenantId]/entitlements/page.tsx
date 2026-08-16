'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleHelp, Filter, History, RefreshCw, RotateCcw, Save, Search, ShieldAlert, SlidersHorizontal, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { systemFetch } from '../../../../../lib/system-api';

type Item = { key: string; value: unknown; planValue: unknown; source: 'plan' | 'override'; overridden: boolean; updatedAt?: string | null };
type Data = { subscription: { id: string; status: string; planId: string; planName: string | null; startedAt?: string; endsAt?: string | null }; entitlements: Item[] };

function display(value: unknown) {
  if (value === null || value === undefined) return 'Unlimited / not set';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isEnabled(value: unknown) {
  return value === true || (typeof value === 'number' && value > 0);
}

function reason(item: Item) {
  if (item.overridden) return 'Tenant override is currently controlling the effective value.';
  if (item.planValue === undefined || item.planValue === null) return 'The current plan does not define this entitlement.';
  return 'Effective value is inherited from the subscription plan.';
}

export default function TenantEntitlementsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [data, setData] = useState<Data | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'overridden'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [d, h] = await Promise.all([
        systemFetch(`/system/tenants/${tenantId}/entitlements`),
        systemFetch(`/system/tenants/${tenantId}/entitlements/history`),
      ]);
      setData(d);
      setHistory(h);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load entitlement information.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (tenantId) void load(); }, [tenantId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.entitlements ?? []).filter((item) => {
      if (q && !item.key.toLowerCase().includes(q)) return false;
      if (filter === 'enabled' && !isEnabled(item.value)) return false;
      if (filter === 'disabled' && isEnabled(item.value)) return false;
      if (filter === 'overridden' && !item.overridden) return false;
      return true;
    });
  }, [data, filter, query]);

  const stats = useMemo(() => {
    const items = data?.entitlements ?? [];
    return {
      total: items.length,
      enabled: items.filter((i) => isEnabled(i.value)).length,
      disabled: items.filter((i) => !isEnabled(i.value)).length,
      overrides: items.filter((i) => i.overridden).length,
    };
  }, [data]);

  function start(item: Item) {
    setEditing(item.key);
    setValue(typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : String(item.value ?? ''));
    setReasonText('');
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError('');
    let parsed: any = value;
    if (value === 'true' || value === 'false') parsed = value === 'true';
    else if (value !== '' && !Number.isNaN(Number(value))) parsed = Number(value);
    else { try { parsed = JSON.parse(value); } catch { parsed = value; } }
    try {
      await systemFetch(`/system/tenants/${tenantId}/entitlements/${encodeURIComponent(editing)}`, {
        method: 'PATCH', body: JSON.stringify({ value: parsed, reason: reasonText.trim() || undefined }),
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to save entitlement override.');
    } finally { setSaving(false); }
  }

  async function reset(key: string) {
    if (!window.confirm(`Reset ${key} to the plan default? The tenant override will be removed.`)) return;
    setError('');
    try {
      await systemFetch(`/system/tenants/${tenantId}/entitlements/${encodeURIComponent(key)}/reset`, { method: 'PATCH' });
      await load();
    } catch (e: any) { setError(e?.message ?? 'Unable to reset entitlement.'); }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/system/tenants" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Tenants</Link>
          <div className="mt-3 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"><SlidersHorizontal className="h-5 w-5" /></div><div><h2 className="text-2xl font-bold tracking-tight text-slate-950">Effective Entitlement Debugger</h2><p className="mt-1 text-sm text-slate-500">See exactly why each tenant feature is enabled, disabled, inherited, or overridden.</p></div></div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="ui-interactive inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div className="flex-1">{error}</div><button onClick={() => setError('')} aria-label="Dismiss error"><XCircle className="h-4 w-4" /></button></div>}

      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div> : data && <>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Total entitlements', stats.total, Filter], ['Enabled', stats.enabled, CheckCircle2], ['Disabled / unset', stats.disabled, XCircle], ['Tenant overrides', stats.overrides, SlidersHorizontal]].map(([label, count, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><Icon className="h-4 w-4 text-[var(--theme-primary)]" /></div><p className="mt-2 text-2xl font-bold text-slate-950">{count}</p></div>)}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Subscription context</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--theme-primary-soft)] px-3 py-1 text-sm font-bold text-[var(--theme-primary)]">{data.subscription.planName ?? data.subscription.planId}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">{data.subscription.status}</span></div></div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-slate-400">Started</p><p className="font-semibold text-slate-700">{data.subscription.startedAt ? new Date(data.subscription.startedAt).toLocaleDateString() : '—'}</p></div><div><p className="text-xs text-slate-400">Ends</p><p className="font-semibold text-slate-700">{data.subscription.endsAt ? new Date(data.subscription.endsAt).toLocaleDateString() : 'No expiry'}</p></div><div><p className="text-xs text-slate-400">Subscription ID</p><p className="max-w-[180px] truncate font-mono text-xs text-slate-600" title={data.subscription.id}>{data.subscription.id}</p></div></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-semibold text-slate-950">Effective entitlements</h3><p className="mt-1 text-xs text-slate-500">The effective value is what the application should enforce for this tenant.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search entitlement key" className="field h-10 w-full pl-9 sm:w-64" /></div><select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="field h-10"><option value="all">All</option><option value="enabled">Enabled</option><option value="disabled">Disabled / unset</option><option value="overridden">Overrides only</option></select></div></div></div>
          {filtered.length === 0 ? <div className="p-14 text-center"><CircleHelp className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">No matching entitlements</p><p className="mt-1 text-sm text-slate-500">Try clearing the search or changing the filter.</p></div> : <div className="divide-y divide-slate-100">{filtered.map((item) => <div key={item.key} className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center hover:bg-slate-50/70"><div><div className="flex items-center gap-2"><p className="font-mono text-sm font-semibold text-slate-900">{item.key}</p>{isEnabled(item.value) ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}</div><p className="mt-1 text-xs text-slate-500">Plan default: {display(item.planValue)}</p><p className="mt-1 text-xs text-slate-400">{reason(item)}</p></div><div><p className="text-xs text-slate-500">Effective value</p><p className="mt-1 font-semibold text-slate-900">{display(item.value)}</p></div><div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.overridden ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item.overridden ? 'Tenant override' : 'Plan inherited'}</span>{item.updatedAt && <p className="mt-2 text-[11px] text-slate-400">Updated {new Date(item.updatedAt).toLocaleString()}</p>}</div><div className="flex flex-wrap gap-2">{item.overridden && <button onClick={() => void reset(item.key)} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><RotateCcw className="h-3.5 w-3.5" />Reset</button>}<button onClick={() => start(item)} className="ui-interactive rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Override</button></div></div>)}</div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 p-5"><History className="h-4 w-4 text-[var(--theme-primary)]" /><div><h3 className="font-semibold text-slate-950">Billing change history</h3><p className="mt-1 text-xs text-slate-500">Every entitlement override/reset is retained for investigation.</p></div></div><div className="divide-y divide-slate-100">{history.length === 0 ? <div className="p-8 text-sm text-slate-500">No entitlement changes recorded.</div> : history.map((event: any, i: number) => <div key={`${event._id ?? i}`} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-sm font-semibold text-slate-800">{event.metadata?.key ?? event.action}</p><p className="text-xs text-slate-500">{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : '—'}</p></div><p className="mt-1 text-xs text-slate-500">Previous: {display(event.metadata?.previousValue)} → New: {display(event.metadata?.newValue)}</p>{event.metadata?.reason && <p className="mt-1 text-xs text-slate-600">Reason: {event.metadata.reason}</p>}</div>)}</div></section>
      </>}

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setEditing(null); }}><div role="dialog" aria-modal="true" aria-labelledby="override-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 id="override-title" className="text-lg font-bold text-slate-950">Override {editing}</h3><p className="mt-1 text-sm text-slate-500">This value takes precedence over the plan until it is reset.</p></div><button disabled={saving} onClick={() => setEditing(null)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><XCircle className="h-5 w-5" /></button></div><textarea value={value} onChange={(e) => setValue(e.target.value)} disabled={saving} className="mt-5 min-h-32 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-soft)]" aria-label="Entitlement value" /><input value={reasonText} onChange={(e) => setReasonText(e.target.value)} disabled={saving} placeholder="Reason for override (recommended)" className="mt-3 field h-11 w-full" /><div className="mt-5 flex justify-end gap-2"><button disabled={saving} onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save override'}</button></div></div></div>}
    </div>
  );
}
