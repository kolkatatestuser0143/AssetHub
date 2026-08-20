'use client';

import Link from 'next/link';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../../../lib/api-client';
import { Badge, Button, LoadingState } from '../../../../../../components/ui';

type Conflict = { id: string; employeeId: string; employeeName: string; field: string; localValue?: string; providerValue?: string; provider?: string; source?: string };

export default function ConflictResolutionPage() {
  const [items, setItems] = useState<Conflict[]>([]);
  const [choices, setChoices] = useState<Record<string, 'local' | 'provider'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { let active = true; void apiFetch('/identity/provisioning/conflicts').then((data) => { if (!active) return; setItems(data?.conflicts ?? data ?? []); }).catch((err: any) => active && setError(err?.message ?? 'Unable to load conflicts.')).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);

  function choose(id: string, choice: 'local' | 'provider') { setChoices((current) => ({ ...current, [id]: choice })); }
  async function resolve() {
    const resolutions = Object.entries(choices).map(([id, choice]) => ({ id, source: choice }));
    if (!resolutions.length) return;
    setSaving(true); setError(null); setMessage(null);
    try { await apiFetch('/identity/provisioning/conflicts/resolve', { method: 'POST', body: JSON.stringify({ resolutions }) }); setItems((current) => current.filter((item) => !choices[item.id])); setChoices({}); setMessage('Selected conflict resolutions were saved.'); }
    catch (err: any) { setError(err?.message ?? 'Unable to save conflict resolutions.'); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-6 page-section-enter">
    <Link href="/settings/identity/provisioning" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15}/>Back to provisioning</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Identity reconciliation</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Resolve sync conflicts</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Every value shows its source. Choose AssetHub/local or the identity provider for each field. AssetHub will not silently overwrite a conflicting value.</p></header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
    {loading ? <div className="panel p-8"><LoadingState label="Loading conflicts…"/></div> : items.length === 0 ? <section className="panel p-10 text-center"><Check className="mx-auto text-emerald-500" size={28}/><h2 className="mt-3 font-semibold text-slate-950">No conflicts</h2><p className="mt-1 text-sm text-slate-500">All synchronized employee fields are currently reconciled.</p></section> : <section className="space-y-4">{items.map((item) => { const choice = choices[item.id]; return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">{item.employeeName}</h2><Badge tone="neutral">{item.employeeId}</Badge></div><p className="mt-1 text-sm text-slate-500">Conflicting field: <span className="font-semibold text-slate-700">{item.field}</span></p></div><Badge tone="warning">Needs decision</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-2"><ValueCard title="AssetHub / Local" value={item.localValue ?? '—'} selected={choice === 'local'} onClick={() => choose(item.id, 'local')} /><ValueCard title={item.provider ? `${item.provider} / Provider` : 'Identity Provider'} value={item.providerValue ?? '—'} selected={choice === 'provider'} onClick={() => choose(item.id, 'provider')} /></div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14}/>Source choice is recorded with the reconciliation action.</div></article>; })}</section>}
    {items.length > 0 && <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"><p className="text-sm text-slate-500">{Object.keys(choices).length} of {items.length} conflicts selected</p><Button onClick={() => void resolve()} loading={saving} disabled={!Object.keys(choices).length}>Save resolutions</Button></div>}
  </div>;
}

function ValueCard({ title, value, selected, onClick }: { title: string; value: string; selected: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${selected ? 'border-[var(--theme-link)] bg-[var(--theme-primary-soft)] ring-1 ring-[var(--theme-link)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>{selected && <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--theme-link)] text-white"><Check size={14}/></span>}</div><p className="mt-3 break-words text-sm font-semibold text-slate-900">{value}</p></button>; }
