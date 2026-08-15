'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock3, RefreshCw, X } from 'lucide-react';
import { apiFetch } from '../../../../../lib/api-client';

type Transfer = { id: string; assetId: string; fromUserId?: string; fromLocationId?: string; fromDepartmentId?: string; toUserId?: string; toLocationId?: string; toDepartmentId?: string; status: string; requestedByUserId: string; requestedAt: string; reason?: string; };

export default function AssetTransfersPage() {
  const [items, setItems] = useState<Transfer[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setBusy(true); setError('');
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await apiFetch(`/assets/transfers${query}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e?.message ?? 'Unable to load transfers.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [status]);

  async function action(id: string, type: 'approve' | 'reject' | 'complete' | 'cancel') {
    setError('');
    try { await apiFetch(`/assets/transfers/${id}/${type}`, { method: 'POST', body: JSON.stringify({}) }); await load(); }
    catch (e: any) { setError(e?.message ?? `Unable to ${type} transfer.`); }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link href="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={16}/>Back to Assets</Link>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Inventory</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Asset transfers</h1><p className="mt-2 text-sm text-slate-500">Review, approve, reject, complete, and cancel asset custody transfers.</p></div>
        <div className="flex items-center gap-2"><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option><option>PENDING</option><option>APPROVED</option><option>COMPLETED</option><option>REJECTED</option><option>CANCELLED</option></select><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button></div>
      </header>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {busy ? <div className="p-8 text-sm text-slate-500">Loading transfers…</div> : items.length === 0 ? <div className="p-12 text-center"><Clock3 className="mx-auto text-slate-300" size={34}/><p className="mt-3 font-semibold text-slate-800">No transfer requests</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">From</th><th className="px-5 py-3">To</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3"/></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><div className="font-mono text-xs text-slate-500">{item.assetId}</div><div className="mt-1 text-xs text-slate-400">{item.reason ?? 'No reason'}</div></td><td className="px-5 py-4 text-xs text-slate-600">User: {item.fromUserId ?? '—'}<br/>Location: {item.fromLocationId ?? '—'}</td><td className="px-5 py-4 text-xs text-slate-600">User: {item.toUserId ?? '—'}<br/>Location: {item.toLocationId ?? '—'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{item.status}</span></td><td className="px-5 py-4 text-xs text-slate-500">{new Date(item.requestedAt).toLocaleString()}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2">{item.status === 'PENDING' && <><button onClick={() => void action(item.id, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Check size={14}/>Approve</button><button onClick={() => void action(item.id, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"><X size={14}/>Reject</button></>}{item.status === 'APPROVED' && <><button onClick={() => void action(item.id, 'complete')} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"><Check size={14}/>Complete</button><button onClick={() => void action(item.id, 'cancel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><X size={14}/>Cancel</button></>}</div></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
