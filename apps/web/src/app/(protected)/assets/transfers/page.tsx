'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock3, RefreshCw, Search, X, ArrowRight, UserRound, MapPin } from 'lucide-react';
import { apiFetch } from '../../../../lib/api-client';

type Transfer = {
  id: string;
  assetId: string;
  fromUserId?: string;
  fromLocationId?: string;
  fromDepartmentId?: string;
  toUserId?: string;
  toLocationId?: string;
  toDepartmentId?: string;
  status: string;
  requestedByUserId: string;
  requestedAt: string;
  reason?: string;
};

const STATUS_OPTIONS = ['', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

function statusMeta(status: string) {
  switch (status) {
    case 'PENDING': return { label: 'Pending approval', className: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' };
    case 'APPROVED': return { label: 'Approved', className: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' };
    case 'COMPLETED': return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' };
    case 'REJECTED': return { label: 'Rejected', className: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' };
    case 'CANCELLED': return { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' };
    default: return { label: status.replaceAll('_', ' '), className: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' };
  }
}

function endpoint(userId?: string, locationId?: string, departmentId?: string) {
  if (userId) return <span className="inline-flex items-center gap-1.5"><UserRound size={14} />User <span className="font-mono text-[11px]">{userId.slice(0, 8)}</span></span>;
  if (locationId) return <span className="inline-flex items-center gap-1.5"><MapPin size={14} />Location <span className="font-mono text-[11px]">{locationId.slice(0, 8)}</span></span>;
  if (departmentId) return <span className="inline-flex items-center gap-1.5"><MapPin size={14} />Department <span className="font-mono text-[11px]">{departmentId.slice(0, 8)}</span></span>;
  return <span className="text-slate-400">Not specified</span>;
}

export default function AssetTransfersPage() {
  const [items, setItems] = useState<Transfer[]>([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setBusy(true); setError('');
    try {
      const params = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await apiFetch(`/assets/transfers${params}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e?.message ?? 'Unable to load transfers.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [status]);

  async function action(id: string, type: 'approve' | 'reject' | 'complete' | 'cancel') {
    setError(''); setActionId(id);
    try { await apiFetch(`/assets/transfers/${id}/${type}`, { method: 'POST', body: JSON.stringify({}) }); await load(); }
    catch (e: any) { setError(e?.message ?? `Unable to ${type} transfer.`); }
    finally { setActionId(null); }
  }

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter(item => [item.assetId, item.reason, item.fromUserId, item.toUserId, item.fromLocationId, item.toLocationId].filter(Boolean).some(v => String(v).toLowerCase().includes(value)));
  }, [items, query]);

  const counts = useMemo(() => ({
    pending: items.filter(i => i.status === 'PENDING').length,
    approved: items.filter(i => i.status === 'APPROVED').length,
    completed: items.filter(i => i.status === 'COMPLETED').length,
  }), [items]);

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <Link href="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"><ArrowLeft size={16}/>Back to assets</Link>

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Inventory operations</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Asset transfers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review and process custody transfers in one place. Approval and completion are kept separate so every movement is traceable.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Awaiting approval</p><p className="mt-1 text-2xl font-bold text-amber-950">{counts.pending}</p><p className="mt-1 text-xs text-amber-700/80">Needs an approval decision</p></div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Ready to complete</p><p className="mt-1 text-2xl font-bold text-blue-950">{counts.approved}</p><p className="mt-1 text-xs text-blue-700/80">Approved custody changes</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Completed</p><p className="mt-1 text-2xl font-bold text-emerald-950">{counts.completed}</p><p className="mt-1 text-xs text-emerald-700/80">Completed transfers in this view</p></div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative min-w-0 flex-1 sm:max-w-md"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search asset, user, location, or reason" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--theme-primary)] focus:bg-white"/></div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--theme-primary)]"><option value="">All statuses</option>{STATUS_OPTIONS.slice(1).map(value => <option key={value} value={value}>{statusMeta(value).label}</option>)}</select>
        </div>

        {error && <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5" role="alert">{error}</div>}

        {busy ? <div className="grid gap-3 p-4 sm:p-5"><div className="h-20 animate-pulse rounded-2xl bg-slate-100"/><div className="h-20 animate-pulse rounded-2xl bg-slate-100"/><div className="h-20 animate-pulse rounded-2xl bg-slate-100"/></div> : filtered.length === 0 ? <div className="p-12 text-center"><Clock3 className="mx-auto text-slate-300" size={36}/><p className="mt-3 font-semibold text-slate-900">No transfer requests found</p><p className="mt-1 text-sm text-slate-500">Try a different status or search term.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">From</th><th className="px-5 py-3">To</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(item => { const meta = statusMeta(item.status); const acting = actionId === item.id; return <tr key={item.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4 align-top"><Link href={`/assets/${item.assetId}`} className="font-semibold text-[var(--theme-link)] hover:underline">{item.assetId.slice(0, 12)}</Link><div className="mt-1 max-w-xs truncate text-xs text-slate-500" title={item.reason}>{item.reason || 'No reason provided'}</div></td><td className="px-5 py-4 align-top text-xs text-slate-600">{endpoint(item.fromUserId, item.fromLocationId, item.fromDepartmentId)}</td><td className="px-5 py-4 align-top text-xs text-slate-600"><span className="mb-1 inline-block text-slate-400"><ArrowRight size={14}/></span>{endpoint(item.toUserId, item.toLocationId, item.toDepartmentId)}</td><td className="px-5 py-4 align-top"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 ${meta.className}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}/>{meta.label}</span></td><td className="px-5 py-4 align-top text-xs text-slate-500">{new Date(item.requestedAt).toLocaleString()}</td><td className="px-5 py-4 align-top"><div className="flex justify-end gap-2">{item.status === 'PENDING' && <><button type="button" disabled={acting} onClick={() => void action(item.id, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"><Check size={14}/>{acting ? 'Working…' : 'Approve'}</button><button type="button" disabled={acting} onClick={() => void action(item.id, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"><X size={14}/>Reject</button></>}{item.status === 'APPROVED' && <><button type="button" disabled={acting} onClick={() => void action(item.id, 'complete')} className="inline-flex items-center gap-1 rounded-lg bg-[var(--theme-primary)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"><Check size={14}/>{acting ? 'Working…' : 'Complete'}</button><button type="button" disabled={acting} onClick={() => void action(item.id, 'cancel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"><X size={14}/>Cancel</button></>}</div></td></tr>; })}</tbody></table></div>}

        {filtered.length > 0 && <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of <span className="font-semibold text-slate-700">{items.length}</span> transfer requests</div>}
      </section>
    </div>
  );
}
