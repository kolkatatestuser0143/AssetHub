'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../../lib/api-client';
import { Badge, Button, LoadingState } from '../../../../../components/ui';

type Preview = { created?: number; updated?: number; deactivated?: number; conflicts?: number; total?: number; provider?: string; items?: Array<{ id?: string; employeeId?: string; name?: string; action?: string; conflicts?: string[] }> };

export default function ProvisioningPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const data = await apiFetch('/identity/provisioning/preview'); setPreview(data?.preview ?? data ?? null); }
    catch (err: any) { setError(err?.message ?? 'Provisioning preview is unavailable.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function sync() {
    setSyncing(true); setError(null);
    try { await apiFetch('/identity/provisioning/sync', { method: 'POST' }); await load(); }
    catch (err: any) { setError(err?.message ?? 'Synchronization could not be started.'); }
    finally { setSyncing(false); }
  }

  const conflicts = preview?.conflicts ?? 0;
  return <div className="mx-auto max-w-6xl space-y-6 page-section-enter">
    <Link href="/settings/identity" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15}/>Back to Identity & SSO</Link>
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Directory provisioning</p><h1 className="mt-1 text-3xl font-bold text-slate-950">SCIM & Synchronization</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Preview provider changes before they affect AssetHub employees. Employee ID is the stable identity matching key.</p></div><Button onClick={() => void sync()} loading={syncing}><RefreshCw size={15}/>Sync now</Button></header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
    {loading ? <div className="panel p-8"><LoadingState label="Loading synchronization preview…"/></div> : <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stat label="Provider" value={preview?.provider ?? '—'}/><Stat label="Discovered" value={String(preview?.total ?? 0)}/><Stat label="Create" value={String(preview?.created ?? 0)}/><Stat label="Update" value={String(preview?.updated ?? 0)}/><Stat label="Conflicts" value={String(conflicts)} danger={conflicts > 0}/></section>
      {conflicts > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 text-amber-600" size={20}/><div><p className="font-semibold text-amber-900">Resolve conflicts before enabling automatic provisioning</p><p className="mt-1 text-sm text-amber-800">AssetHub will not silently overwrite conflicting employee information. Review each source value and choose the authoritative value.</p><Link href="/settings/identity/provisioning/conflicts" className="mt-3 inline-block text-sm font-semibold text-amber-900 underline">Review conflicts</Link></div></div></div>}
      <section className="panel overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-950">Synchronization preview</h2><p className="mt-1 text-sm text-slate-500">Only the actions shown here should be applied during the next synchronization.</p></div>{(preview?.items?.length ?? 0) === 0 ? <div className="p-8 text-center text-sm text-slate-500"><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={22}/>No pending changes.</div> : <div className="divide-y divide-slate-100">{preview?.items?.map((item, index) => <div key={item.id ?? index} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-900">{item.name ?? item.employeeId ?? 'Employee'}</p><p className="mt-1 text-xs text-slate-500">Employee ID: {item.employeeId ?? '—'}</p>{item.conflicts?.map((conflict) => <p key={conflict} className="mt-1 text-xs text-amber-700">{conflict}</p>)}</div><Badge tone={item.action === 'CREATE' ? 'brand' : item.action === 'DEACTIVATE' ? 'warning' : item.conflicts?.length ? 'warning' : 'neutral'}>{item.action ?? 'UPDATE'}</Badge></div>)}</div>}</section>
      <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14}/>Provider changes are previewed before they are applied to employee records.</div>
    </>}
  </div>;
}
function Stat({label,value,danger}:{label:string;value:string;danger?:boolean}) { return <div className={`rounded-2xl border p-5 shadow-sm ${danger?'border-amber-200 bg-amber-50':'border-slate-200 bg-white'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-xl font-bold ${danger?'text-amber-800':'text-slate-950'}`}>{value}</p></div>; }
