'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, FileText, Save } from 'lucide-react';
import { apiFetch, downloadFile } from '../../../../lib/api-client';

const STATES = ['REQUESTED', 'IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'LOST_STOLEN', 'RETIRED', 'DISPOSED'];
type Option = { id: string; name: string };

export default function AssetReportsPage() {
  const [companies, setCompanies] = useState<Option[]>([]);
  const [assetTypes, setAssetTypes] = useState<Option[]>([]);
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [assetTypeId, setAssetTypeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState<'excel' | 'pdf' | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([apiFetch('/companies'), apiFetch('/assets/types')])
      .then(([companyData, typeData]) => {
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setAssetTypes(Array.isArray(typeData) ? typeData : []);
      })
      .catch((e: any) => setError(e?.message ?? 'Unable to load report filters.'));
  }, []);

  function queryString() {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (companyId) params.set('companyId', companyId);
    if (assetTypeId) params.set('assetTypeId', assetTypeId);
    if (locationId.trim()) params.set('locationId', locationId.trim());
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    return params.toString() ? `?${params.toString()}` : '';
  }

  async function exportReport(kind: 'excel' | 'pdf') {
    setBusy(kind); setError(''); setSuccess('');
    try {
      const { blob, filename } = await downloadFile(`/assets/reports/${kind}${queryString()}`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSuccess(`${kind === 'excel' ? 'Excel' : 'PDF'} report generated successfully.`);
    } catch (e: any) {
      setError(e?.message ?? `Unable to generate ${kind.toUpperCase()} report.`);
    } finally { setBusy(''); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={16}/>Back to Assets</Link>
      <header>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Reports</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Asset Reports</h1><p className="mt-2 text-sm text-slate-500">Choose filters and export the tenant-scoped inventory as Excel or a printable PDF.</p></div>
          <Link href="/assets/reports/templates" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Save size={16}/>Saved templates</Link>
        </div>
      </header>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><FileSpreadsheet size={18} className="text-blue-600"/><h2 className="font-semibold text-slate-950">Report filters</h2></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option>{STATES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Company</span><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Asset type</span><select value={assetTypeId} onChange={(e) => setAssetTypeId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All asset types</option>{assetTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Location ID</span><input value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="Optional location ID" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Created from</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Created to</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button onClick={() => void exportReport('pdf')} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><FileText size={17}/>{busy === 'pdf' ? 'Generating…' : 'Generate PDF'}</button>
          <button onClick={() => void exportReport('excel')} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Download size={17}/>{busy === 'excel' ? 'Generating…' : 'Generate Excel'}</button>
        </div>
      </section>
    </div>
  );
}
