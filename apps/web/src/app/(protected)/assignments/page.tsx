'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Boxes, CheckCircle2, ClipboardCheck, ClipboardList, History, Plus, RefreshCw, Search, UserRoundCheck, UserRoundX, X, Workflow, type LucideIcon } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';
import { StatusBadge, Button, EmptyState } from '../../../components/ui';

type Asset = { id: string; assetNumber: string; status: string; condition?: string; assetType?: { name: string } };
type User = { id: string; email: string; firstName: string; lastName: string; isActive: boolean };
type Assignment = { id: string; assetId: string; userId?: string; assignedAt: string; returnedAt?: string; notes?: string; conditionAtReturn?: string; active: boolean; asset?: Asset | null; user?: User | null };
type View = 'ready' | 'assigned' | 'returned' | 'history';
type Metric = { label: string; value: number; desc: string; iconClass: string; Icon: LucideIcon; view: View };

const RETURN_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'NEEDS_INSPECTION'];

function getUserFacingError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Asset is already assigned')) return 'This asset is already assigned. Refresh the workspace and choose an available asset.';
  if (message.includes('cannot be assigned while in')) return message;
  if (message.includes('Damaged or inspection-required assets')) return 'This asset cannot be assigned because it is damaged or requires inspection.';
  if (message.includes('inactive user')) return 'That user is inactive and cannot receive an asset.';
  return message || fallback;
}

export default function AssignmentsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [view, setView] = useState<View>('ready');
  const [query, setQuery] = useState('');
  const [assetId, setAssetId] = useState('');
  const [userId, setUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [returning, setReturning] = useState<Assignment | null>(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [assetData, userData, assignmentData] = await Promise.all([
        apiFetch('/assets?status=IN_STOCK&page=1&pageSize=100'),
        apiFetch('/users'),
        apiFetch('/assets/assignments'),
      ]);
      setAssets(Array.isArray(assetData?.items) ? assetData.items : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
    } catch (err: unknown) {
      setError(getUserFacingError(err, 'Unable to load asset operations.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const activeAssignments = useMemo(() => assignments.filter((item) => item.active), [assignments]);
  const returnedAssignments = useMemo(() => assignments.filter((item) => !item.active), [assignments]);
  const activeAssetIds = useMemo(() => new Set(activeAssignments.map((item) => item.assetId)), [activeAssignments]);
  const availableAssets = useMemo(() => assets.filter((asset) => !activeAssetIds.has(asset.id)), [assets, activeAssetIds]);
  const readyAssets = useMemo(() => availableAssets.filter((asset) => asset.condition !== 'DAMAGED' && asset.condition !== 'NEEDS_INSPECTION'), [availableAssets]);

  const filteredReady = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return readyAssets;
    return readyAssets.filter((item) => `${item.assetNumber} ${item.assetType?.name ?? ''} ${item.condition ?? ''}`.toLowerCase().includes(value));
  }, [readyAssets, query]);

  const filteredAssigned = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return activeAssignments;
    return activeAssignments.filter((item) => `${item.asset?.assetNumber ?? ''} ${item.asset?.assetType?.name ?? ''} ${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''} ${item.user?.email ?? ''} ${item.notes ?? ''}`.toLowerCase().includes(value));
  }, [activeAssignments, query]);

  const filteredReturned = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return returnedAssignments;
    return returnedAssignments.filter((item) => `${item.asset?.assetNumber ?? ''} ${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''} ${item.conditionAtReturn ?? ''} ${item.notes ?? ''}`.toLowerCase().includes(value));
  }, [returnedAssignments, query]);

  const metrics: Metric[] = [
    { label: 'Ready to issue', value: readyAssets.length, desc: 'In-stock assets eligible for custody', iconClass: 'text-emerald-600 bg-emerald-50', Icon: Boxes, view: 'ready' },
    { label: 'Assigned', value: activeAssignments.length, desc: 'Assets currently held by employees', iconClass: 'text-blue-600 bg-blue-50', Icon: UserRoundCheck, view: 'assigned' },
    { label: 'Returned', value: returnedAssignments.length, desc: 'Closed custody records', iconClass: 'text-violet-600 bg-violet-50', Icon: UserRoundX, view: 'returned' },
    { label: 'History', value: assignments.length, desc: 'Complete custody records', iconClass: 'text-slate-600 bg-slate-100', Icon: History, view: 'history' },
  ];

  async function assign() {
    if (!assetId || !userId) return;
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      await apiFetch(`/assets/${assetId}/assign`, { method: 'POST', body: JSON.stringify({ userId, notes: notes.trim() || undefined }) });
      setAssetId(''); setUserId(''); setNotes(''); setShowAssign(false); setView('assigned');
      setSuccess('Asset issued successfully.');
      await load();
    } catch (err: unknown) {
      setError(getUserFacingError(err, 'Unable to issue asset. Refresh the workspace and try again.'));
      await load();
    } finally { setSubmitting(false); }
  }

  async function unassign() {
    if (!returning) return;
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      await apiFetch(`/assets/${returning.assetId}/unassign`, { method: 'POST', body: JSON.stringify({ condition: returnCondition, notes: returnNotes.trim() || undefined }) });
      setSuccess('Asset returned successfully. The custody record is now closed.');
      setReturning(null); setReturnNotes(''); setReturnCondition('GOOD'); setView('returned');
      await load();
    } catch (err: unknown) {
      setError(getUserFacingError(err, 'Unable to complete the return. Refresh and try again.'));
    } finally { setSubmitting(false); }
  }

  const currentRows = view === 'ready' ? filteredReady : view === 'assigned' ? filteredAssigned : filteredReturned;

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Operations</p>
        <div className="mt-1 flex items-center gap-3"><h1 className="text-3xl font-bold tracking-tight text-slate-950">Asset Operations</h1><span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-primary)]/20 bg-[var(--theme-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-link)]"><Workflow size={13}/>Central control</span></div>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">One workspace for issuing, current custody, returns and history. Use Asset 360 for the record; use Operations for day-to-day asset movement.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/assets/lifecycle" className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">Lifecycle queue</Link>
        <Link href="/assets/transfers" className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><ArrowRight size={15}/>Transfers</Link>
        <Button variant="secondary" onClick={() => void load()} loading={loading} icon={<RefreshCw size={16}/>}>Refresh</Button>
        <Button onClick={() => { setView('ready'); setShowAssign(true); }} icon={<Plus size={16}/>}>Issue asset</Button>
      </div>
    </header>

    {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={17}/>{success}</div></div>}
    {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert"><div className="flex items-center justify-between gap-4"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error" className="rounded-lg p-1 hover:bg-amber-100"><X size={16}/></button></div></div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, desc, iconClass, Icon, view: target }) => <button key={label} type="button" onClick={() => setView(target)} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${view === target ? 'border-[var(--theme-primary)]/30 ring-2 ring-[var(--theme-primary)]/10' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${iconClass}`}><Icon size={18}/></div><ArrowRight size={16} className="text-slate-300"/></div><p className="mt-4 text-sm font-semibold text-slate-800">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{loading ? '—' : value}</p><p className="mt-1 text-xs text-slate-500">{desc}</p></button>)}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operational queue</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{view === 'ready' ? 'Ready to issue' : view === 'assigned' ? 'Current custody' : view === 'returned' ? 'Returned assets' : 'Custody history'}</h2><p className="mt-1 text-sm text-slate-500">{view === 'ready' ? 'Only healthy in-stock assets are shown for issuance.' : view === 'assigned' ? 'One row represents one asset currently held by an employee.' : view === 'returned' ? 'Recently completed custody records.' : 'Use history for audit and traceability.'}</p></div>
        <div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset, employee, type or notes" className="field h-10 pl-9" aria-label="Search asset operations"/></div>
      </div>

      {showAssign && <div className="border-b border-[var(--theme-primary)]/15 bg-[var(--theme-primary-soft)] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-link)]">Custody workflow</p><h3 className="mt-1 text-base font-semibold text-slate-950">Issue an asset</h3><p className="mt-1 text-sm text-slate-500">Select an eligible asset and active employee. Issuance creates the custody record and moves the asset into assigned custody.</p></div><button onClick={() => setShowAssign(false)} aria-label="Close issue workflow" className="rounded-lg p-2 text-slate-500 hover:bg-white"><X size={18}/></button></div><div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto]"><select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="field h-11"><option value="">Select in-stock asset</option>{readyAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetNumber}{asset.assetType?.name ? ` · ${asset.assetType.name}` : ''}</option>)}</select><select value={userId} onChange={(e) => setUserId(e.target.value)} className="field h-11"><option value="">Select active employee</option>{users.filter((user) => user.isActive).map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} · {user.email}</option>)}</select><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional issue notes" className="field h-11"/><Button disabled={!assetId || !userId || submitting} loading={submitting} onClick={() => void assign()} icon={<CheckCircle2 size={16}/>}>Confirm issue</Button></div>{readyAssets.length === 0 && <p className="mt-3 text-xs font-medium text-amber-700">No eligible in-stock assets are currently available.</p>}</div>}

      {loading ? <div className="space-y-3 p-5">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100"/>)}</div> : view === 'history' ? <div>{assignments.length === 0 ? <EmptyState title="No custody history yet" text="Issued and returned assets will appear here."/> : <div className="divide-y divide-slate-100">{assignments.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/assets/${item.assetId}`} className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{item.asset?.assetNumber ?? item.assetId}</Link><StatusBadge status={item.active ? 'ASSIGNED' : item.conditionAtReturn ?? 'RETURNED'}/></div><p className="mt-1 text-xs text-slate-500">{item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Unknown employee'} · issued {new Date(item.assignedAt).toLocaleDateString()}{item.returnedAt ? ` · returned ${new Date(item.returnedAt).toLocaleDateString()}` : ''}</p></div><Link href={`/assets/${item.assetId}`} className="text-xs font-semibold text-[var(--theme-link)]">Open Asset 360</Link></div>)}</div>}</div> : currentRows.length === 0 ? <EmptyState title={query ? 'No records match your search' : view === 'ready' ? 'No assets are ready to issue' : view === 'assigned' ? 'No active custody records' : 'No returned custody records'} text={query ? 'Try another asset number, employee or note.' : view === 'ready' ? 'Healthy in-stock assets will appear here when available.' : view === 'assigned' ? 'Issued assets will appear here with their current custodian.' : 'Completed returns will appear here.'} action={query ? 'Clear search' : view === 'ready' ? 'Issue an asset' : undefined} onAction={query ? () => setQuery('') : view === 'ready' ? () => setShowAssign(true) : undefined}/> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{view === 'ready' ? <><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Condition</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></> : <><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Custodian</th><th className="px-5 py-3">Issued</th><th className="px-5 py-3">Condition</th><th className="px-5 py-3 text-right">Action</th></>}</tr></thead><tbody className="divide-y divide-slate-100">{view === 'ready' ? filteredReady.map((asset) => <tr key={asset.id} className="transition-colors hover:bg-[var(--theme-primary-soft)]/50"><td className="px-5 py-4"><Link href={`/assets/${asset.id}`} className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{asset.assetNumber}</Link></td><td className="px-5 py-4 text-slate-600">{asset.assetType?.name ?? '—'}</td><td className="px-5 py-4"><StatusBadge status={asset.condition ?? 'UNKNOWN'}/></td><td className="px-5 py-4"><StatusBadge status="IN_STOCK"/></td><td className="px-5 py-4 text-right"><Button size="sm" onClick={() => { setAssetId(asset.id); setShowAssign(true); setView('ready'); }} icon={<Plus size={14}/>}>Issue</Button></td></tr>) : view === 'assigned' ? filteredAssigned.map((item) => <tr key={item.id} className="transition-colors hover:bg-[var(--theme-primary-soft)]/50"><td className="px-5 py-4"><Link href={`/assets/${item.assetId}`} className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{item.asset?.assetNumber ?? item.assetId}</Link><div className="mt-1 text-xs text-slate-400">{item.asset?.assetType?.name ?? 'Asset'}</div></td><td className="px-5 py-4"><div className="font-medium text-slate-900">{item.user ? `${item.user.firstName} ${item.user.lastName}` : '—'}</div><div className="text-xs text-slate-500">{item.user?.email ?? 'Unknown employee'}</div></td><td className="px-5 py-4 text-slate-700">{new Date(item.assignedAt).toLocaleDateString()}</td><td className="px-5 py-4"><StatusBadge status={item.asset?.condition ?? 'UNKNOWN'}/></td><td className="px-5 py-4 text-right"><Button variant="secondary" size="sm" disabled={submitting} onClick={() => { setReturning(item); setReturnCondition(item.asset?.condition && RETURN_CONDITIONS.includes(item.asset.condition) ? item.asset.condition : 'GOOD'); setReturnNotes(''); }} icon={<ArrowRight size={14}/>}>Return</Button></td></tr>) : filteredReturned.map((item) => <tr key={item.id} className="hover:bg-[var(--theme-primary-soft)]/50"><td className="px-5 py-4"><Link href={`/assets/${item.assetId}`} className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{item.asset?.assetNumber ?? item.assetId}</Link></td><td className="px-5 py-4"><div className="font-medium text-slate-900">{item.user ? `${item.user.firstName} ${item.user.lastName}` : '—'}</div></td><td className="px-5 py-4 text-slate-700">{item.returnedAt ? new Date(item.returnedAt).toLocaleDateString() : '—'}</td><td className="px-5 py-4"><StatusBadge status={item.conditionAtReturn ?? 'RETURNED'}/></td><td className="px-5 py-4 text-right"><Link href={`/assets/${item.assetId}`} className="text-xs font-semibold text-[var(--theme-link)]">Open Asset 360</Link></td></tr>)}</tbody></table></div>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold text-slate-950"><ClipboardCheck size={18} className="text-[var(--theme-link)]"/>Operational rules</div><div className="mt-4 grid gap-3 md:grid-cols-4"><div className="rounded-xl bg-emerald-50 p-4"><p className="font-semibold text-emerald-900">In Stock</p><p className="mt-1 text-sm text-emerald-800">Ready for issue when condition is healthy.</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="font-semibold text-blue-900">Assigned</p><p className="mt-1 text-sm text-blue-800">Controlled through custody, acknowledgement and return.</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="font-semibold text-amber-900">Condition</p><p className="mt-1 text-sm text-amber-800">Damaged or inspection-required assets cannot be issued.</p></div><div className="rounded-xl bg-violet-50 p-4"><p className="font-semibold text-violet-900">Audit</p><p className="mt-1 text-sm text-violet-800">Every issue and return remains traceable in history.</p></div></div></section>

    {returning && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="return-dialog-title"><div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-link)]">Close custody</p><h2 id="return-dialog-title" className="mt-1 text-xl font-bold text-slate-950">Return {returning.asset?.assetNumber ?? 'asset'}</h2><p className="mt-1 text-sm text-slate-500">Record the condition at return before closing the custody record.</p></div><button onClick={() => setReturning(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={18}/></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Condition at return</span><select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} className="field h-11 w-full">{RETURN_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition.replaceAll('_', ' ')}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Return notes <span className="font-normal text-slate-400">(optional)</span></span><textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} rows={4} placeholder="Condition details, accessories returned, damage, etc." className="field w-full resize-none"/></label></div><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setReturning(null)}>Cancel</Button><Button onClick={() => void unassign()} loading={submitting} icon={<CheckCircle2 size={16}/>}>Complete return</Button></div></div></div>}
  </div>;
}
