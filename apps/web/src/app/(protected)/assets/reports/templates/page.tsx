'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch, downloadFile } from '../../../../../lib/api-client';

const STATES = ['REQUESTED', 'IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'LOST_STOLEN', 'RETIRED', 'DISPOSED'];
type Option = { id: string; name: string };
type Template = { id: string; name: string; description?: string | null; filters: Record<string, string>; };

export default function ReportTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [assetTypes, setAssetTypes] = useState<Option[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [assetTypeId, setAssetTypeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [templateData, companyData, typeData] = await Promise.all([
        apiFetch('/assets/report-templates'),
        apiFetch('/companies'),
        apiFetch('/assets/types'),
      ]);
      setTemplates(Array.isArray(templateData) ? templateData : []);
      setCompanies(Array.isArray(companyData) ? companyData : []);
      setAssetTypes(Array.isArray(typeData) ? typeData : []);
    } catch (e: any) { setError(e?.message ?? 'Unable to load report templates.'); }
  }
  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId(null); setName(''); setDescription(''); setStatus(''); setCompanyId(''); setAssetTypeId(''); setLocationId(''); setFromDate(''); setToDate('');
  }
  function edit(template: Template) {
    const f = template.filters ?? {};
    setEditingId(template.id); setName(template.name); setDescription(template.description ?? ''); setStatus(f.status ?? ''); setCompanyId(f.companyId ?? ''); setAssetTypeId(f.assetTypeId ?? ''); setLocationId(f.locationId ?? ''); setFromDate(f.fromDate ?? ''); setToDate(f.toDate ?? '');
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const body = { name: name.trim(), description: description.trim() || undefined, status: status || undefined, companyId: companyId || undefined, assetTypeId: assetTypeId || undefined, locationId: locationId.trim() || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined };
    try {
      await apiFetch(editingId ? `/assets/report-templates/${editingId}` : '/assets/report-templates', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      resetForm(); await load();
    } catch (e: any) { setError(e?.message ?? 'Unable to save template.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this report template?')) return;
    setError('');
    try { await apiFetch(`/assets/report-templates/${id}`, { method: 'DELETE' }); await load(); if (editingId === id) resetForm(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete template.'); }
  }
  function queryString(filters: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters ?? {})) if (value) params.set(key, value);
    return params.toString();
  }
  async function download(template: Template, format: 'excel' | 'pdf') {
    setError('');
    try {
      const suffix = queryString(template.filters);
      const { blob, filename } = await downloadFile(`/assets/reports/${format}${suffix ? `?${suffix}` : ''}`);
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { setError(e?.message ?? `Unable to generate ${format} report.`); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/assets/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={16}/>Back to Reports</Link>
      <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Reports</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Saved report templates</h1><p className="mt-2 text-sm text-slate-500">Save frequently used asset filters and export them to Excel or PDF in one click.</p></header>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><Plus size={18} className="text-blue-600"/><h2 className="font-semibold text-slate-950">{editingId ? 'Edit template' : 'Create template'}</h2></div>
        <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5"><span className="text-sm font-medium">Name</span><input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly Asset Register" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium">Description</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="All active company assets" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium">Status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium">Company</span><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All companies</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium">Asset type</span><select value={assetTypeId} onChange={(e) => setAssetTypeId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All asset types</option>{assetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium">Location ID</span><input value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="Optional location ID" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium">Created from</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium">Created to</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
          <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Clear</button><button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save template'}</button></div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {templates.map((template) => <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-slate-950">{template.name}</h3><p className="mt-1 text-sm text-slate-500">{template.description || 'Saved asset report filter'}</p></div><div className="flex gap-1"><button onClick={() => edit(template)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil size={16}/></button><button onClick={() => void remove(template.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={16}/></button></div></div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(template.filters ?? {}).map(([key, value]) => <span key={key} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{key}: {value}</span>)}{Object.keys(template.filters ?? {}).length === 0 && <span className="text-xs text-slate-500">No filters — full tenant report</span>}</div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void download(template, 'excel')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><Download size={15}/>Excel</button><button onClick={() => void download(template, 'pdf')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><Download size={15}/>PDF</button></div></article>)}
        {templates.length === 0 && <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No saved templates yet.</div>}
      </section>
    </div>
  );
}
