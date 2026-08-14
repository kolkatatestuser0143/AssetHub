'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api-client';
import { ArrowRight, Boxes, CheckCircle2, ClipboardList, History, Plus, RefreshCw, Search, UserRound, UserRoundCheck, UserRoundX } from 'lucide-react';

type Asset = {
  id: string;
  assetNumber: string;
  status: string;
  assetType?: { name: string };
};

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type Assignment = {
  id: string;
  assetId: string;
  userId?: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
  active: boolean;
  asset?: Asset | null;
  user?: User | null;
};

export default function AssignmentsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [query, setQuery] = useState('');
  const [assetId, setAssetId] = useState('');
  const [userId, setUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [assetData, userData, assignmentData] = await Promise.all([
        apiFetch('/assets'),
        apiFetch('/users'),
        apiFetch('/assets/assignments'),
      ]);

      setAssets(Array.isArray(assetData) ? assetData : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load assignment data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.active),
    [assignments],
  );

  const returnedAssignments = useMemo(
    () => assignments.filter((item) => !item.active),
    [assignments],
  );

  const activeAssetIds = useMemo(
    () => new Set(activeAssignments.map((item) => item.assetId)),
    [activeAssignments],
  );

  const availableAssets = useMemo(
    () => assets.filter((asset) => !activeAssetIds.has(asset.id)),
    [assets, activeAssetIds],
  );

  const filteredActive = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return activeAssignments;

    return activeAssignments.filter((item) => {
      const assetText = `${item.asset?.assetNumber ?? ''} ${item.asset?.assetType?.name ?? ''}`;
      const userText = `${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''} ${item.user?.email ?? ''}`;
      return `${assetText} ${userText} ${item.notes ?? ''}`.toLowerCase().includes(value);
    });
  }, [activeAssignments, query]);

  async function assign() {
    if (!assetId || !userId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/assets/${assetId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          notes: notes.trim() || undefined,
        }),
      });

      setAssetId('');
      setUserId('');
      setNotes('');
      setShowAssign(false);
      setSuccess('Asset assigned successfully.');
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to assign asset.');
    } finally {
      setSubmitting(false);
    }
  }

  async function unassign(item: Assignment) {
    if (!item.assetId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/assets/${item.assetId}/unassign`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Returned from assignment workspace.' }),
      });
      setSuccess('Asset unassigned successfully.');
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to unassign asset.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1450px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Assignments</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Assign assets to active users, process returns, and keep a complete ownership history.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
          <button onClick={() => setShowAssign((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            <Plus size={16} />Assign asset
          </button>
        </div>
      </div>

      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showAssign && (
        <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><ClipboardList size={19} /></div>
            <div><h2 className="font-semibold text-slate-950">Create assignment</h2><p className="mt-1 text-sm text-slate-500">Only unassigned assets and active tenant users are eligible.</p></div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr_auto]">
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">
              <option value="">Select asset</option>
              {availableAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetNumber}{asset.assetType?.name ? ` · ${asset.assetType.name}` : ''}</option>)}
            </select>

            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">
              <option value="">Select user</option>
              {users.filter((user) => user.isActive).map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} · {user.email}</option>)}
            </select>

            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional assignment notes" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500" />

            <button disabled={!assetId || !userId || submitting} onClick={assign} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Assign
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Active assignments', activeAssignments.length, UserRoundCheck, 'text-emerald-600 bg-emerald-50'],
          ['Unassigned assets', availableAssets.length, Boxes, 'text-blue-600 bg-blue-50'],
          ['Returned records', returnedAssignments.length, UserRoundX, 'text-slate-600 bg-slate-100'],
          ['Assignment history', assignments.length, History, 'text-violet-600 bg-violet-50'],
        ].map(([label, value, Icon, iconClass]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconClass}`}><Icon size={18} /></div>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Active assignments</h2>
            <p className="mt-1 text-xs text-slate-500">Current ownership records only.</p>
          </div>
          <div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset, user, or notes" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : filteredActive.length === 0 ? (
          <div className="p-14 text-center"><ClipboardList className="mx-auto text-slate-300" size={38} /><p className="mt-4 font-semibold text-slate-800">No active assignments</p><p className="mt-1 text-sm text-slate-500">Assign an asset to a user to start tracking ownership.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Assigned to</th><th className="px-5 py-3">Assigned</th><th className="px-5 py-3">Notes</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredActive.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/assets/${item.assetId}`} className="font-semibold text-slate-900 hover:text-blue-600">{item.asset?.assetNumber ?? item.assetId}</Link><div className="mt-1 text-xs text-slate-400">{item.asset?.assetType?.name ?? 'Asset'}</div></td><td className="px-5 py-4"><div className="font-medium text-slate-900">{item.user ? `${item.user.firstName} ${item.user.lastName}` : '—'}</div><div className="text-xs text-slate-500">{item.user?.email ?? 'Unknown user'}</div></td><td className="px-5 py-4 text-slate-700">{new Date(item.assignedAt).toLocaleDateString()}</td><td className="max-w-xs px-5 py-4 text-slate-500">{item.notes || '—'}</td><td className="px-5 py-4 text-right"><button disabled={submitting} onClick={() => unassign(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Return <ArrowRight size={14} /></button></td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><History size={18} className="text-violet-600" /><h2 className="font-semibold text-slate-950">Recent returned records</h2></div>
        {returnedAssignments.length === 0 ? <p className="mt-4 text-sm text-slate-500">No returned assignment records yet.</p> : <div className="mt-4 divide-y divide-slate-100">{returnedAssignments.slice(0, 10).map((item) => <div key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-900">{item.asset?.assetNumber ?? item.assetId}</p><p className="text-xs text-slate-500">{item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Unknown user'} · assigned {new Date(item.assignedAt).toLocaleDateString()}</p></div><span className="text-xs font-medium text-slate-500">Returned {item.returnedAt ? new Date(item.returnedAt).toLocaleDateString() : '—'}</span></div>)}</div>}
      </section>
    </div>
  );
}
