'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Field = { key: string; label: string; fieldType: string };
const TYPES = ['text', 'number', 'boolean', 'date'];

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await apiFetch('/custom-fields');
      setFields(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Unable to load custom fields');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      await apiFetch('/custom-fields', { method: 'POST', body: JSON.stringify({ key, label, fieldType }) });
      setKey(''); setLabel(''); setFieldType('text'); setMessage('Custom field created.'); await load();
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(fieldKey: string) {
    if (!window.confirm(`Delete custom field “${fieldKey}”?`)) return;
    try { await apiFetch(`/custom-fields/${encodeURIComponent(fieldKey)}`, { method: 'DELETE' }); await load(); }
    catch (err: any) { setError(err.message); }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Inventory configuration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Custom fields</h1><p className="mt-1 text-sm text-slate-500">Define reusable asset metadata without changing the core inventory schema.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><SlidersHorizontal size={18}/></span><div><h2 className="font-semibold text-slate-950">Create field</h2><p className="text-sm text-slate-500">Keys are stable identifiers used by stored asset values.</p></div></div><form onSubmit={create} className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto]"><input required pattern="[a-z][a-z0-9_.-]{0,63}" value={key} onChange={(e)=>setKey(e.target.value)} placeholder="vendor.asset_code" className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/><input required value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Vendor asset code" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/><select value={fieldType} onChange={(e)=>setFieldType(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">{TYPES.map((type)=><option key={type}>{type}</option>)}</select><button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16}/>{busy?'Saving…':'Create'}</button></form>{message&&<div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={16}/>{message}</div>}{error&&<div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}</section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Defined fields</h2></div>{loading?<div className="p-10 text-center text-sm text-slate-500">Loading custom fields…</div>:fields.length===0?<div className="p-12 text-center text-sm text-slate-500">No custom fields have been defined.</div>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Key</th><th className="px-5 py-3">Label</th><th className="px-5 py-3">Type</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{fields.map((field)=><tr key={field.key} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs text-slate-700">{field.key}</td><td className="px-5 py-4 font-medium text-slate-900">{field.label}</td><td className="px-5 py-4"><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs uppercase text-slate-600">{field.fieldType}</span></td><td className="px-5 py-4 text-right"><button onClick={()=>remove(field.key)} aria-label={`Delete ${field.label}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
