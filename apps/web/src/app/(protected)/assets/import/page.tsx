'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Upload, XCircle } from 'lucide-react';
import { apiFetch } from '../../../../lib/api-client';

export default function AssetImportPage() {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function previewImport() {
    setBusy(true); setError(''); setMessage(''); setPreview(null);
    try {
      const result = await apiFetch('/assets/import/preview', { method: 'POST', body: JSON.stringify({ csv }) });
      setPreview(result);
    } catch (e: any) { setError(e?.message ?? 'Unable to validate CSV.'); }
    finally { setBusy(false); }
  }

  async function commitImport() {
    if (!preview) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await apiFetch('/assets/import', { method: 'POST', body: JSON.stringify({ csv }) });
      setMessage(`Imported ${result.imported ?? 0} assets successfully.`);
      setCsv(''); setPreview(null);
    } catch (e: any) { setError(e?.message ?? 'Unable to import assets.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3"><Link href="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={16}/>Back to Assets</Link></div>
      <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Inventory</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Import assets</h1><p className="mt-2 text-sm text-slate-500">Validate the entire CSV against your tenant license before any asset records are created.</p></header>
      {error && <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><XCircle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
      {message && <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/>{message}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-950"><Upload size={18} className="text-blue-600"/>CSV input</div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Required column: <code>assetTypeId</code>. Optional columns: <code>locationId</code>, <code>departmentId</code>, <code>vendorId</code>, <code>fieldsJson</code>. Maximum 5,000 data rows per import.</p>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={16} spellCheck={false} placeholder={'assetTypeId,locationId,departmentId,vendorId,fieldsJson\n665...,665...,665...,665...,"{\"serialNumber\":\"ABC-001\"}"'} className="mt-4 w-full rounded-xl border border-slate-200 p-4 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy || !csv.trim()} onClick={previewImport} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Validating…' : 'Validate & preview'}</button>{preview && <button disabled={busy} onClick={commitImport} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Importing…' : `Import ${preview.rowCount} assets`}</button>}</div>
      </section>

      {preview && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Preview</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Rows</p><p className="mt-1 text-2xl font-bold">{preview.rowCount}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Current assets</p><p className="mt-1 text-2xl font-bold">{preview.currentAssets}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Projected assets</p><p className="mt-1 text-2xl font-bold">{preview.projectedAssets}</p></div></div><div className="mt-4 overflow-x-auto"><table className="min-w-[850px] w-full text-left text-xs"><thead className="bg-slate-50 uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Line</th><th className="px-3 py-2">Asset Type</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Vendor</th><th className="px-3 py-2">Fields</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.rows.map((row: any) => <tr key={row.line}><td className="px-3 py-2 font-semibold">{row.line}</td><td className="px-3 py-2 font-mono">{row.assetTypeId}</td><td className="px-3 py-2 font-mono">{row.locationId ?? '—'}</td><td className="px-3 py-2 font-mono">{row.departmentId ?? '—'}</td><td className="px-3 py-2 font-mono">{row.vendorId ?? '—'}</td><td className="px-3 py-2 font-mono">{JSON.stringify(row.fields)}</td></tr>)}</tbody></table></div></section>}
    </div>
  );
}
