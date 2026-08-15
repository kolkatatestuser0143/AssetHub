'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileText, Pencil, Plus, Save, X } from 'lucide-react';
import { apiFetch, downloadFile } from '../../lib/api-client';

type Template = { id: string; name: string; content: string; isDefault: boolean };
type Acknowledgement = { id: string; status: 'PENDING' | 'ACKNOWLEDGED'; templateName: string; generatedAt: string; generatedByUserId: string; documentId?: string; acknowledgedAt?: string; acknowledgedByUserId?: string; acknowledgementNote?: string };

const DEFAULT = 'ASSET HANDOVER ACKNOWLEDGEMENT\n\nI, {{employee.name}} (Employee ID: {{employee.employeeId}}), acknowledge receipt of the following company asset:\n\nAsset: {{asset.assetNumber}}\nType: {{asset.type}}\nSerial Number: {{asset.serialNumber}}\nAssigned Date: {{assignment.date}}\n\nI confirm that the above asset has been issued to me for business use and I will take reasonable care of it, use it in accordance with company policy, and return it when requested or when my employment/assignment ends.\n\nEmployee Name: {{employee.name}}\nEmployee ID: {{employee.employeeId}}\nSignature: ______________________________\nDate: ____________________\n\nIssued By: {{issuer.name}}\nDate: {{assignment.date}}';

const PLACEHOLDERS = [
  '{{employee.name}}', '{{employee.employeeId}}', '{{employee.email}}', '{{employee.jobTitle}}',
  '{{asset.assetNumber}}', '{{asset.type}}', '{{asset.serialNumber}}', '{{asset.model}}',
  '{{assignment.date}}', '{{issuer.name}}',
];

export default function AssetAcknowledgementPanel({ assetId }: { assetId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]); const [selected, setSelected] = useState<Template | null>(null); const [latest, setLatest] = useState<Acknowledgement | null>(null);
  const [name, setName] = useState('Default asset acknowledgement'); const [content, setContent] = useState(DEFAULT); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try { const [rows, acknowledgement] = await Promise.all([apiFetch('/asset-acknowledgements/templates'), apiFetch(`/asset-acknowledgements/assets/${assetId}`)]); const list = Array.isArray(rows) ? rows : []; setTemplates(list); setLatest(acknowledgement ?? null); const current = list.find((t: Template) => t.isDefault) ?? list[0]; if (current) { setSelected(current); setName(current.name); setContent(current.content); } }
    catch { setMessage('Unable to load acknowledgement status.'); }
  }
  useEffect(() => { void load(); }, [assetId]);

  async function save() { setBusy(true); setMessage(null); try { if (selected) await apiFetch(`/asset-acknowledgements/templates/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ name, content }) }); else await apiFetch('/asset-acknowledgements/templates', { method: 'POST', body: JSON.stringify({ name, content }) }); setMessage('Acknowledgement template saved.'); setEditing(false); await load(); } catch (e: any) { setMessage(e?.message ?? 'Unable to save template.'); } finally { setBusy(false); } }

  async function generate() { setBusy(true); setMessage(null); try { const result = await downloadFile(`/asset-acknowledgements/assets/${assetId}/pdf`, false, { method: 'POST', body: JSON.stringify({ templateId: selected?.id }) }); const url = URL.createObjectURL(result.blob); const a = document.createElement('a'); a.href = url; a.download = result.filename || `asset-acknowledgement-${assetId}.pdf`; a.click(); URL.revokeObjectURL(url); setMessage('Acknowledgement generated and stored in Asset Documents. Employee acknowledgement is now pending.'); await load(); } catch (e: any) { setMessage(e?.message ?? 'Unable to generate acknowledgement PDF.'); } finally { setBusy(false); } }

  async function downloadLatest() { if (!latest?.id) return; setBusy(true); setMessage(null); try { const result = await downloadFile(`/asset-acknowledgements/${latest.id}/pdf`); const url = URL.createObjectURL(result.blob); const a = document.createElement('a'); a.href = url; a.download = result.filename || `asset-acknowledgement-${assetId}.pdf`; a.click(); URL.revokeObjectURL(url); } catch (e: any) { setMessage(e?.message ?? 'Unable to download stored acknowledgement PDF.'); } finally { setBusy(false); } }

  async function acknowledge() { if (!latest || latest.status === 'ACKNOWLEDGED') return; setBusy(true); setMessage(null); try { await apiFetch(`/asset-acknowledgements/${latest.id}/acknowledge`, { method: 'POST', body: JSON.stringify({}) }); setMessage('Asset acknowledgement recorded.'); await load(); } catch (e: any) { setMessage(e?.message ?? 'Only the assigned employee can acknowledge this asset.'); } finally { setBusy(false); } }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div><div className="flex items-center gap-2 font-semibold text-slate-950"><FileText size={18} className="text-blue-600"/>Asset acknowledgement</div><p className="mt-1 text-sm text-slate-500">Edit the PDF text, generate the acknowledgement, and record employee acceptance.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => setEditing(true)} className="ui-interactive inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><Pencil size={15}/>Edit content</button><button onClick={() => void generate()} disabled={busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><FileText size={15}/>{busy ? 'Working…' : 'Generate PDF'}</button>{latest?.documentId && <button onClick={() => void downloadLatest()} disabled={busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><Download size={15}/>Download stored PDF</button>}{latest?.status === 'PENDING' && <button onClick={() => void acknowledge()} disabled={busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={15}/>Acknowledge</button>}</div>
      </div>
      {latest && <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${latest.status === 'ACKNOWLEDGED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><div className="font-semibold">{latest.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Pending employee acknowledgement'}</div><div className="mt-1 text-xs opacity-80">Generated {new Date(latest.generatedAt).toLocaleString()} · Template: {latest.templateName}{latest.acknowledgedAt ? ` · Acknowledged ${new Date(latest.acknowledgedAt).toLocaleString()}` : ''}</div></div>}
      {message && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">{message}</div>}
      <div className="mt-5 flex flex-wrap items-center gap-2">{templates.map((t) => <button key={t.id} onClick={() => { setSelected(t); setName(t.name); setContent(t.content); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selected?.id === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{t.name}{t.isDefault ? ' · Default' : ''}</button>)} {!templates.length && <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"><Plus size={13}/>Create template</button>}</div>
      {editing && <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">Edit acknowledgement</h3><button onClick={() => setEditing(false)} className="ui-interactive rounded-lg p-1"><X size={16}/></button></div><input value={name} onChange={(e) => setName(e.target.value)} className="mt-4 h-10 w-full rounded-xl border px-3 text-sm" placeholder="Template name"/><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} className="mt-3 w-full rounded-xl border p-3 font-mono text-sm leading-6"/><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">Supported placeholders: {PLACEHOLDERS.map((placeholder) => <code key={placeholder}>{placeholder}</code>)}</div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditing(false)} className="ui-interactive rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button onClick={() => void save()} disabled={busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Save size={15}/>{busy ? 'Saving…' : 'Save content'}</button></div></div>}
    </section>
  );
}
