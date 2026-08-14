'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, RefreshCw, Trash2, Upload } from 'lucide-react';
import { apiFetch, getAccessToken } from '../../lib/api-client';

type DocumentItem = { id: string; fileName: string; contentType?: string; sizeBytes?: number; documentType?: string; createdAt?: string };
const DOCUMENT_TYPES = ['INVOICE', 'PURCHASE_ORDER', 'WARRANTY_CERTIFICATE', 'PHOTO', 'DISPOSAL_RECORD', 'OTHER'];
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

function formatBytes(value?: number) {
  if (!value) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetDocumentsPanel({ assetId }: { assetId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentType, setDocumentType] = useState('OTHER');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const data = await apiFetch(`/assets/${assetId}/documents`); setDocuments(Array.isArray(data) ? data : []); }
    catch (err: any) { setError(err?.message ?? 'Unable to load documents.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [assetId]);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true); setError(null); setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/assets/${assetId}/documents?documentType=${encodeURIComponent(documentType)}`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? `Upload failed: ${response.status}`);
      setDocuments((current) => [data, ...current]);
      if (inputRef.current) inputRef.current.value = '';
      setMessage('Document uploaded successfully.');
    } catch (err: any) { setError(err?.message ?? 'Unable to upload document.'); }
    finally { setUploading(false); }
  }

  async function download(document: DocumentItem) {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/assets/${assetId}/documents/${document.id}/download`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!response.ok) throw new Error('Unable to download document.');
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = document.fileName; anchor.click(); URL.revokeObjectURL(url);
    } catch (err: any) { setError(err?.message ?? 'Unable to download document.'); }
  }

  async function remove(documentId: string) {
    setError(null); setMessage(null);
    try { await apiFetch(`/assets/${assetId}/documents/${documentId}`, { method: 'DELETE' }); setDocuments((current) => current.filter((item) => item.id !== documentId)); setMessage('Document deleted.'); }
    catch (err: any) { setError(err?.message ?? 'Unable to delete document.'); }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2 font-semibold text-slate-900"><FileText size={18} className="text-blue-600" />Documents & attachments</div><p className="mt-1 text-sm text-slate-500">Store invoices, purchase orders, warranty certificates, photos, and disposal records with this asset.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]"><select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select><input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,.doc,.docx,.xls,.xlsx" className="h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"/><button type="button" onClick={() => void upload()} disabled={uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Upload size={16} />{uploading ? 'Uploading…' : 'Upload'}</button></div>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      <div className="mt-5 space-y-3">{loading ? [1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />) : documents.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><FileText size={26} className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No documents attached</p><p className="mt-1 text-xs text-slate-500">Upload the first asset record above.</p></div> : documents.map((document) => <div key={document.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-slate-900">{document.fileName}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{(document.documentType ?? 'OTHER').replaceAll('_', ' ')}</span></div><p className="mt-1 text-xs text-slate-500">{formatBytes(document.sizeBytes)} · {document.contentType ?? 'Unknown type'} · {document.createdAt ? new Date(document.createdAt).toLocaleString() : '—'}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => void download(document)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} />Download</button><button type="button" onClick={() => void remove(document.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14} />Delete</button></div></div>)}</div>
    </section>
  );
}
