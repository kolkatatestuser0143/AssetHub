'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Send, ShieldAlert, UserRound, Wrench } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Button, StatusBadge } from '../ui';

type Employee = { id: string; firstName?: string; lastName?: string; email: string; employeeId?: string; isActive?: boolean };
type ActionKey = 'assign' | 'return' | 'transfer' | 'repair' | 'lost' | 'retire' | 'dispose';
type Mode = 'assign' | 'return' | 'transfer' | 'reason' | null;
type Props = { assetId: string; assetNumber?: string; status?: string; onChanged?: () => void };

const label = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const targetState = (key: ActionKey) => ({ repair: 'IN_REPAIR', lost: 'LOST_STOLEN', retire: 'RETIRED', dispose: 'DISPOSED' } as const)[key as keyof typeof targetState] ?? '';

export default function AssetOperationsPanel({ assetId, assetNumber, status, onChanged }: Props) {
  const [current, setCurrent] = useState(status ?? '');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCurrent(status ?? ''), [status]);
  useEffect(() => {
    if (!['IN_STOCK', 'ASSIGNED'].includes(status ?? '')) return;
    void apiFetch('/users/employees').then((data: any) => {
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setEmployees(items.filter((u: Employee) => u?.id && u?.email && u?.isActive !== false));
    }).catch(() => undefined);
  }, [status]);

  const actions = useMemo<ActionKey[]>(() => {
    switch (current) {
      case 'IN_STOCK': return ['assign', 'transfer', 'repair', 'lost', 'retire'];
      case 'ASSIGNED': return ['return', 'transfer', 'repair', 'lost'];
      case 'IN_REPAIR': return ['retire'];
      case 'LOST_STOLEN': return ['retire'];
      case 'RETIRED': return ['dispose'];
      default: return [];
    }
  }, [current]);

  const meta: Record<ActionKey, { label: string; icon: any; primary?: boolean; danger?: boolean }> = {
    assign: { label: 'Assign asset', icon: UserRound, primary: true },
    return: { label: 'Return asset', icon: RotateCcw, primary: true },
    transfer: { label: 'Transfer', icon: Send },
    repair: { label: 'Send to repair', icon: Wrench },
    lost: { label: 'Mark lost / stolen', icon: ShieldAlert, danger: true },
    retire: { label: 'Retire asset', icon: ShieldAlert },
    dispose: { label: 'Dispose asset', icon: ShieldAlert, danger: true },
  };

  function begin(key: ActionKey) {
    setError(null); setMessage(null); setPending(key);
    if (key === 'assign' || key === 'return' || key === 'transfer') setMode(key);
    else setMode('reason');
  }

  async function submit() {
    if (!pending) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      if (mode === 'assign') {
        if (!targetUserId) throw new Error('Select an employee.');
        await apiFetch(`/assets/${assetId}/assign`, { method: 'POST', body: JSON.stringify({ userId: targetUserId, notes: notes.trim() || undefined }) });
      } else if (mode === 'return') {
        await apiFetch(`/assets/${assetId}/unassign`, { method: 'POST', body: JSON.stringify({ condition, notes: notes.trim() || undefined }) });
      } else if (mode === 'transfer') {
        if (!targetUserId) throw new Error('Select the destination employee.');
        await apiFetch(`/assets/${assetId}/transfer`, { method: 'POST', body: JSON.stringify({ toUserId: targetUserId, reason: reason.trim() || undefined, note: notes.trim() || undefined }) });
      } else if (mode === 'reason') {
        const toState = targetState(pending);
        if (!toState) throw new Error('Invalid lifecycle operation.');
        if (!reason.trim()) throw new Error('A reason is required.');
        await apiFetch(`/assets/${assetId}/transition`, { method: 'POST', body: JSON.stringify({ toState, reason: reason.trim() }) });
      }
      setMessage(mode === 'transfer' ? 'Transfer request created.' : `${meta[pending].label} completed.`);
      setMode(null); setPending(null); setReason(''); setNotes(''); setTargetUserId('');
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Unable to complete the asset operation.');
    } finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Asset operations">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2 font-semibold text-slate-900"><ArrowRight size={18} className="text-[var(--theme-link)]"/>Asset operations</div><p className="mt-1 text-sm text-slate-500">Only actions valid for the current lifecycle state are shown.</p></div>
      {current ? <StatusBadge status={current} /> : null}
    </div>
    {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
    {message ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map(key => { const item = meta[key]; const Icon = item.icon; return <Button key={key} size="sm" variant={item.primary ? 'primary' : 'secondary'} onClick={() => begin(key)} icon={<Icon size={15}/>}>{item.label}</Button>; })}
      {current === 'DISPOSED' ? <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">No further operations</span> : null}
    </div>
    {mode ? <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{pending ? meta[pending].label : 'Asset operation'}</p><p className="mt-1 text-xs text-slate-500">{assetNumber ? `${assetNumber} · ` : ''}This action is recorded in the asset audit trail.</p></div><button type="button" onClick={() => { setMode(null); setPending(null); }} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Cancel</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(mode === 'assign' || mode === 'transfer') ? <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">{mode === 'assign' ? 'Employee' : 'Destination employee'}</span><select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="field h-10 w-full"><option value="">Select employee</option>{employees.map(user => <option key={user.id} value={user.id}>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email} · {user.employeeId || user.email}</option>)}</select></label> : null}
        {mode === 'return' ? <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Condition at return</span><select value={condition} onChange={e => setCondition(e.target.value)} className="field h-10 w-full"><option>NEW</option><option>GOOD</option><option>FAIR</option><option>DAMAGED</option><option>NEEDS_INSPECTION</option></select></label> : null}
        {(mode === 'transfer' || mode === 'return' || mode === 'assign') ? <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">Notes</span><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="field w-full" placeholder="Optional operational notes." /></label> : null}
        {mode === 'reason' ? <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">Reason</span><textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="field w-full" placeholder="Why is this lifecycle operation being performed?" /></label> : null}
        {mode === 'transfer' ? <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">Transfer reason</span><input value={reason} onChange={e => setReason(e.target.value)} className="field h-10 w-full" placeholder="Optional reason" /></label> : null}
      </div>
      <div className="mt-4 flex justify-end"><Button size="sm" onClick={() => void submit()} loading={busy} icon={<Check size={15}/>}>Confirm operation</Button></div>
    </div> : null}
  </section>;
}
