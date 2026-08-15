'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch } from '../../../../lib/api-client';

type Template = { id: string; name: string; content: string; isDefault: boolean };
const PLACEHOLDERS = ['{{employee.name}}', '{{employee.employeeId}}', '{{employee.email}}', '{{employee.jobTitle}}', '{{asset.assetNumber}}', '{{asset.type}}', '{{asset.serialNumber}}', '{{asset.model}}', '{{assignment.date}}', '{{issuer.name}}'];

const DEFAULT_CONTENT = `ASSET HANDOVER ACKNOWLEDGEMENT\n\nI, {{employee.name}} (Employee ID: {{employee.employeeId}}), acknowledge receipt of the following company asset:\n\nAsset: {{asset.assetNumber}}\nType: {{asset.type}}\nSerial Number: {{asset.serialNumber}}\nAssigned Date: {{assignment.date}}\n\nI confirm that the above asset has been issued to me for business use and I will take reasonable care of it, use it in accordance with company policy, and return it when requested or when my employment/assignment ends.\n\nEmployee Name: {{employee.name}}\nEmployee ID: {{employee.employeeId}}\nSignature: ______________________________\nDate: ____________________\n\nIssued By: {{issuer.name}}\nDate: {{assignment.date}}`;

export default function AcknowledgementSettingsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const list = await apiFetch('/asset-acknowledgements/templates');
    const rows = Array.isArray(list) ? list : [];
    setTemplates(rows);
    const current = rows.find((t: Template) => t.isDefault) ?? rows[0];
    if (current) { setSelected(current); setName(current.name); setContent(current.content); }
    else { setSelected(null); setName('Default asset acknowledgement'); setContent(DEFAULT_CONTENT); }
  }

  useEffect(() => { void load(); }, []);

  function newTemplate() { setSelected(null); setName('New acknowledgement'); setContent(DEFAULT_CONTENT); setMessage(null); }

  async function save() {
    setBusy(true); setMessage(null);
    try {
      if (selected) await apiFetch(`/asset-acknowledgements/templates/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ name, content }) });
      else await apiFetch('/asset-acknowledgements/templates', { method: 'POST', body: JSON.stringify({ name, content }) });
      await load(); setMessage('Acknowledgement template saved.');
    } catch (e: any) { setMessage(e?.message ?? 'Unable to save template.'); }
    finally { setBusy(false); }
  }

  async function setDefault() {
    if (!selected) return;
    setBusy(true); setMessage(null);
    try { await apiFetch(`/asset-acknowledgements/templates/${selected.id}/default`, { method: 'POST' }); await load(); setMessage('Default template updated.'); }
    catch (e: any) { setMessage(e?.message ?? 'Unable to set default template.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selected || selected.isDefault || !window.confirm('Delete this acknowledgement template?')) return;
    setBusy(true); setMessage(null);
    try { await apiFetch(`/asset-acknowledgements/templates/${selected.id}`, { method: 'DELETE' }); await load(); setMessage('Template deleted.'); }
    catch (e: any) { setMessage(e?.message ?? 'Unable to delete template.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Documents</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Asset acknowledgement</h1><p className="mt-2 text-sm text-slate-500">Edit the text used when generating employee asset handover acknowledgement PDFs.</p></div>
      {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">Templates</h2><button onClick={newTemplate} className="ui-interactive inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-semibold"><Plus size={14}/>New</button></div><div className="mt-4 space-y-2">{templates.map((t) => <button key={t.id} onClick={() => { setSelected(t); setName(t.name); setContent(t.content); setMessage(null); }} className={`w-full rounded-xl border p-3 text-left ${selected?.id === t.id ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-soft)]' : 'border-slate-200 hover:bg-slate-50'}`}><p className="text-sm font-semibold">{t.name}</p><p className="mt-1 text-xs text-slate-500">{t.isDefault ? 'Default template' : 'Custom template'}</p></button>)}{!templates.length && <p className="py-8 text-center text-sm text-slate-500">No templates yet.</p>}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><FileText size={18} className="text-[var(--theme-link)]"/><h2 className="font-semibold">Template content</h2></div><input value={name} onChange={(e) => setName(e.target.value)} className="mt-5 h-11 w-full rounded-xl border px-3 text-sm" placeholder="Template name"/><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={22} className="mt-3 w-full rounded-xl border p-4 font-mono text-sm leading-6"/><div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600"><p className="font-semibold text-slate-900">Supported placeholders</p><div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 leading-6">{PLACEHOLDERS.map((placeholder) => <code key={placeholder}>{placeholder}</code>)}</div></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={remove} disabled={!selected || selected.isDefault || busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"><Trash2 size={15}/>Delete</button>{selected && !selected.isDefault && <button onClick={() => void setDefault()} disabled={busy} className="ui-interactive rounded-xl border px-4 py-2.5 text-sm font-semibold">Set default</button>}<button onClick={() => void save()} disabled={busy || !name.trim() || !content.trim()} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>{busy ? 'Saving…' : 'Save template'}</button></div></section>
      </div>
    </div>
  );
}
