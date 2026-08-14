'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, History, Package, RefreshCw, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import { apiFetch } from '../../../../lib/api-client';

const STATES = ['REQUESTED', 'IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'LOST_STOLEN', 'RETIRED', 'DISPOSED'];

type Asset = { id: string; assetNumber: string; status: string; assetType?: { name: string }; [key: string]: any };
type Warranty = { provider?: string; expiresAt?: string } | null;
type Assignment = { userId?: string; notes?: string; assignedAt?: string; returnedAt?: string } | null;

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function AssetDetailPage({ params }: { params: { assetId: string } }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [warranty, setWarranty] = useState<Warranty>(null);
  const [assignment, setAssignment] = useState<Assignment>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [state, setState] = useState('');
  const [provider, setProvider] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  async function load() {
    setBusy(true);
    setMessage(null);
    try {
      const all = await apiFetch('/assets');
      const found = (Array.isArray(all) ? all : []).find((item: Asset) => item.id === params.assetId);
      if (!found) throw new Error('Asset not found.');
      setAsset(found);
      setState(found.status);

      const [warrantyData, assignmentData, fieldsData, historyData] = await Promise.allSettled([
        apiFetch(`/assets/${params.assetId}/warranty`),
        apiFetch(`/assets/${params.assetId}/assignment`),
        apiFetch(`/assets/${params.assetId}/custom-fields`),
        apiFetch(`/assets/${params.assetId}/assignment/history`),
      ]);

      if (warrantyData.status === 'fulfilled') {
        setWarranty(warrantyData.value ?? null);
        setProvider(warrantyData.value?.provider ?? '');
        setExpiresAt(warrantyData.value?.expiresAt ? String(warrantyData.value.expiresAt).slice(0, 10) : '');
      }
      if (assignmentData.status === 'fulfilled') setAssignment(assignmentData.value ?? null);
      if (fieldsData.status === 'fulfilled') setCustomFields(fieldsData.value?.values ?? fieldsData.value ?? {});
      if (historyData.status === 'fulfilled') setAssignmentHistory(Array.isArray(historyData.value) ? historyData.value : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load asset.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, [params.assetId]);

  async function transition(nextState: string) {
    if (!asset || nextState === asset.status) return;
    setTransitioning(true);
    try {
      await apiFetch(`/assets/${asset.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toState: nextState }),
      });
      setMessage(`Asset moved to ${nextState}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to change lifecycle state.');
    } finally {
      setTransitioning(false);
    }
  }

  async function saveWarranty(event: React.FormEvent) {
    event.preventDefault();
    try {
      await apiFetch(`/assets/${params.assetId}/warranty`, {
        method: 'PUT',
        body: JSON.stringify({
          provider: provider.trim() || undefined,
          expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00.000Z`).toISOString() : undefined,
        }),
      });
      setMessage('Warranty saved.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save warranty.');
    }
  }

  const warrantyLabel = useMemo(() => {
    if (!warranty?.expiresAt) return 'Not configured';
    return new Date(warranty.expiresAt).toLocaleDateString();
  }, [warranty]);

  if (busy) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200"/><div className="h-32 animate-pulse rounded-2xl bg-slate-100"/><div className="grid gap-6 lg:grid-cols-3"><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/></div></div>;
  }

  if (!asset) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{message ?? 'Asset not found.'}</div>;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Link href="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/>Back to assets</Link>
      {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Asset detail</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{asset.assetNumber}</h1>
          <p className="mt-2 text-sm text-slate-500">{asset.assetType?.name ?? 'Unclassified asset'} · {asset.id}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Lifecycle</label><select value={state} onChange={(event) => { setState(event.target.value); void transition(event.target.value); }} disabled={transitioning} className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-60">{STATES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <Link href="/assignments" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Manage assignments</Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Package size={18} className="text-blue-600"/>Overview</div>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Lifecycle</dt><dd className="font-semibold text-slate-900">{asset.status}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Type</dt><dd className="font-semibold text-slate-900">{asset.assetType?.name ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Serial number</dt><dd className="font-semibold text-slate-900">{asset.serialNumber ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Model</dt><dd className="font-semibold text-slate-900">{asset.model ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Warranty</dt><dd className="font-semibold text-slate-900">{warrantyLabel}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><UserRound size={18} className="text-blue-600"/>Current assignment</div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
            {assignment ? <><p className="font-semibold text-slate-900">Assigned user</p><p className="mt-1 font-mono text-xs text-slate-500">{assignment.userId ?? 'Unknown'}</p><p className="mt-2 text-xs text-slate-500">Assigned {formatDate(assignment.assignedAt)}</p>{assignment.notes && <p className="mt-2 text-xs text-slate-600">{assignment.notes}</p>}</> : <p className="text-slate-500">No active assignment.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Wrench size={18} className="text-blue-600"/>Support</div>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Vendor</dt><dd className="font-semibold text-slate-900">{asset.vendorId ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Warranty provider</dt><dd className="font-semibold text-slate-900">{warranty?.provider ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Warranty expiry</dt><dd className="font-semibold text-slate-900">{warrantyLabel}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Location</dt><dd className="font-semibold text-slate-900">{asset.locationId ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Department</dt><dd className="font-semibold text-slate-900">{asset.departmentId ?? '—'}</dd></div>
          </dl>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><div className="flex items-center gap-2 font-semibold text-slate-900"><History size={18} className="text-blue-600"/>Assignment history</div><p className="mt-1 text-sm text-slate-500">Custody records for this asset.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={14}/>Refresh</button></div>
          {assignmentHistory.length === 0 ? <p className="mt-5 text-sm text-slate-500">No assignment records.</p> : <div className="mt-5 space-y-3">{assignmentHistory.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">{item.userId || 'Unassigned'}</p><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.returnedAt ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{item.returnedAt ? 'Returned' : 'Active'}</span></div><p className="mt-1 text-xs text-slate-500">Assigned {formatDate(item.assignedAt)}{item.returnedAt ? ` · Returned ${formatDate(item.returnedAt)}` : ''}</p>{item.notes && <p className="mt-2 text-xs text-slate-600">{item.notes}</p>}</div>)}</div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck size={18} className="text-blue-600"/>Custom fields</div>
          {Object.keys(customFields).length === 0 ? <p className="mt-5 text-sm text-slate-500">No custom-field values.</p> : <dl className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(customFields).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><dt className="font-mono text-xs text-slate-500">{key}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{String(value)}</dd></div>)}</dl>}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck size={18} className="text-blue-600"/>Warranty management</div>
        <form onSubmit={saveWarranty} className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Warranty provider" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          <button className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Save warranty</button>
        </form>
      </section>
    </div>
  );
}
