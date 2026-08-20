'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../../lib/api-client';
import { Badge, Button, LoadingState } from '../../../../../components/ui';

type Mapping = { id?: string; source: string; target: string; required?: boolean };
const targets = ['employeeId', 'email', 'firstName', 'lastName', 'department', 'jobTitle', 'phone', 'location'];
const defaults: Mapping[] = [
  { source: 'employeeNumber', target: 'employeeId', required: true },
  { source: 'mail', target: 'email', required: true },
  { source: 'givenName', target: 'firstName' },
  { source: 'surname', target: 'lastName' },
  { source: 'department', target: 'department' },
  { source: 'title', target: 'jobTitle' },
];

export default function MappingPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void apiFetch('/identity/mappings').then((data) => { if (active) setMappings(data?.mappings?.length ? data.mappings : defaults); }).catch((err: any) => { if (active) { setMappings(defaults); setError(err?.message ?? 'Saved mappings could not be loaded; showing defaults.'); } }).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  function update(index: number, patch: Partial<Mapping>) { setMappings(current => current.map((item, i) => i === index ? { ...item, ...patch } : item)); setMessage(null); }
  function add() { setMappings(current => [...current, { source: '', target: 'phone' }]); setMessage(null); }
  function remove(index: number) { setMappings(current => current.filter((_, i) => i !== index)); setMessage(null); }
  async function save() { setSaving(true); setError(null); setMessage(null); try { await apiFetch('/identity/mappings', { method: 'PUT', body: JSON.stringify({ mappings }) }); setMessage('Attribute mappings saved.'); } catch (err: any) { setError(err?.message ?? 'Unable to save attribute mappings.'); } finally { setSaving(false); } }
  if (loading) return <div className="mx-auto max-w-5xl py-10"><LoadingState label="Loading attribute mappings…" /></div>;
  return <div className="mx-auto max-w-5xl space-y-6 page-section-enter">
    <Link href="/settings/identity" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15}/>Back to Identity & SSO</Link>
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Directory normalization</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Attribute mapping</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Choose which provider attributes populate AssetHub employee fields. Keep Employee ID mapped to the provider's stable identifier.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setMappings(defaults)}><RotateCcw size={15}/>Reset</Button><Button onClick={() => void save()} loading={saving}><Save size={15}/>Save mappings</Button></div></header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}{message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
    <section className="panel overflow-hidden"><div className="border-b border-slate-100 bg-slate-50/70 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Provider → AssetHub</h2><p className="mt-1 text-sm text-slate-500">Map provider attributes to employee fields. Required identity fields stay protected.</p></div><Badge tone="neutral">{mappings.length} mappings</Badge></div></div><div className="divide-y divide-slate-100">{mappings.map((mapping, index) => <div key={mapping.id ?? index} className="p-4 sm:p-5"><div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]"><label><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Provider attribute</span><input value={mapping.source} onChange={e => update(index, { source: e.target.value })} placeholder="e.g. employeeNumber" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--theme-link)]"/></label><label><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">AssetHub field</span><select value={mapping.target} disabled={mapping.required} onChange={e => update(index, { target: e.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--theme-link)]">{targets.map(target => <option key={target} value={target}>{target}</option>)}</select></label><div className="flex items-center justify-end gap-2">{mapping.required ? <Badge tone="warning">Required</Badge> : <button type="button" onClick={() => remove(index)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove mapping"><Trash2 size={16}/></button>}</div></div></div>)}<div className="p-4"><button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-[var(--theme-link)] hover:text-[var(--theme-link)]"><Plus size={15}/>Add mapping</button></div></div></section>
    <div className="rounded-2xl border border-[var(--theme-primary)]/15 bg-[var(--theme-primary-soft)] p-5"><p className="font-semibold text-slate-900">Identity matching rule</p><p className="mt-1 text-sm leading-6 text-slate-600">Employee ID is the stable cross-provider key. Email can synchronize, but it should not silently replace an existing Employee ID.</p></div>
  </div>;
}
