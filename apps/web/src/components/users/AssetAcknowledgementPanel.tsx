'use client';

import { useEffect, useState } from 'react';
import { FileText, Pencil, Plus, Save, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

type Template = { id: string; name: string; content: string; isDefault: boolean };

const DEFAULT = 'ASSET HANDOVER ACKNOWLEDGEMENT\n\nI, {{employee.name}} (Employee ID: {{employee.employeeId}}), acknowledge receipt of the following company asset:\n\nAsset: {{asset.assetNumber}}\nType: {{asset.type}}\nSerial Number: {{asset.serialNumber}}\nAssigned Date: {{assignment.date}}\n\nI confirm that the above asset has been issued to me for business use and I will take reasonable care of it, use it in accordance with company policy, and return it when requested or when my employment/assignment ends.\n\nEmployee Name: {{employee.name}}\nEmployee ID: {{employee.employeeId}}\nSignature: ______________________________\nDate: ____________________\n\nIssued By: {{issuer.name}}\nDate: {{assignment.date}}';

export default function AssetAcknowledgementPanel({ assetId }: { assetId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [name, setName] = useState('Default asset acknowledgement');
  const [content, setContent] = useState(DEFAULT);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await apiFetch('/asset-acknowledgements/templates');
      const list = Array.isArray(rows) ? rows : [];
      setTemplates(list);
      const current = list.find((t: Template) => t.isDefault) ?? list[0];
      if (current) { setSelected(current); setName(current.name); setContent(current.content); }
    } catch { setMessage('Unable to load acknowledgement templates.'); }
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    setBusy(true); setMessage(null);
    try {
      if (selected) await apiFetch(`/asset-acknowledgements/templates/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ name, content }) });
      else await apiFetch('/asset-acknowledgements/templates', { method: 'POST', body: JSON.stringify({ name, content }) });
      setMessage('Acknowledgement template saved.'); setEditing(false); await load();
    } catch (e: any) { setMessage(e?.message ?? 'Unable to save template.'); }
    finally { setBusy(false); }
  }

  async function generate() {
    setBusy(true); setMessage(null);
    try {
      const blob = await apiFetch(`/asset-acknowledgements/assets/${assetId}/pdf`, { method: 'POST', body: JSON.stringify({ templateId: selected?.id }) });
      if (blob instanceof Blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `asset-acknowledgement-${assetId}.pdf`; a.click(); URL.revokeObjectURL(url); }
    } catch (e: any) { setMessage(e?.message ?? 'Unable to generate acknowledgement PDF.'); }
    finally { setBusy(false); }
  }

  return <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
    <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
      <div><div className='flex items-center gap-2 font-semibold text-slate-950'><FileText size={18} className='text-blue-600'/>Asset acknowledgement</div><p className='mt-1 text-sm text-slate-500'>Edit the PDF text before generating the employee acknowledgement.</p></div>
      <div className='flex gap-2'><button onClick={() => setEditing(true)} className='ui-interactive inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold'><Pencil size={15}/>Edit content</button><button onClick={() => void generate()} disabled={busy} className='ui-interactive inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white'><FileText size={15}/>{busy ? 'Working…' : 'Generate PDF'}</button></div>
    </div>
    {message && <div className='mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800' role='status'>{message}</div>}
    <div className='mt-5 flex flex-wrap items-center gap-2'>{templates.map((t) => <button key={t.id} onClick={() => { setSelected(t); setName(t.name); setContent(t.content); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selected?.id === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{t.name}{t.isDefault ? ' · Default' : ''}</button>)} {!templates.length && <button onClick={() => setEditing(true)} className='inline-flex items-center gap-1 text-xs font-semibold text-blue-700'><Plus size={13}/>Create template</button>}</div>
    {editing && <div className='mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4'><div className='flex items-center justify-between'><h3 className='font-semibold text-slate-900'>Edit acknowledgement</h3><button onClick={() => setEditing(false)} className='ui-interactive rounded-lg p-1'><X size={16}/></button></div><input value={name} onChange={(e) => setName(e.target.value)} className='mt-4 h-10 w-full rounded-xl border px-3 text-sm' placeholder='Template name'/><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} className='mt-3 w-full rounded-xl border p-3 font-mono text-sm leading-6'/><div className='mt-3 flex flex-wrap gap-2 text-xs text-slate-500'>Supported placeholders: <code>{{employee.name}}</code><code>{{employee.employeeId}}</code><code>{{employee.email}}</code><code>{{employee.jobTitle}}</code><code>{{asset.assetNumber}}</code><code>{{asset.type}}</code><code>{{asset.serialNumber}}</code><code>{{asset.model}}</code><code>{{assignment.date}}</code><code>{{issuer.name}}</code></div><div className='mt-4 flex justify-end gap-2'><button onClick={() => setEditing(false)} className='ui-interactive rounded-xl border px-4 py-2 text-sm font-semibold'>Cancel</button><button onClick={() => void save()} disabled={busy} className='ui-interactive inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white'><Save size={15}/>{busy ? 'Saving…' : 'Save content'}</button></div></div>}
  </section>;
}
