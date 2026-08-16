'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, FileText, Filter, RefreshCw, Save } from 'lucide-react';
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
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadFilters() {
    setLoadingFilters(true); setError('');
    try {
      const [companyData, typeData] = await Promise.all([apiFetch('/companies'), apiFetch('/assets/types')]);
      setCompanies(Array.isArray(companyData) ? companyData : []);
      setAssetTypes(Array.isArray(typeData) ? typeData : []);
    } catch (e: any) { setError(e?.message ?? 'Unable to load report filters. Please refresh and try again.'); }
    finally { setLoadingFilters(false); }
  }
  useEffect(() => { void loadFilters(); }, []);

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

  const activeFilters = useMemo(() => [status, companyId, assetTypeId, locationId.trim(), fromDate, toDate].filter(Boolean).length, [status, companyId, assetTypeId, locationId, fromDate, toDate]);
  function clearFilters() { setStatus(''); setCompanyId(''); setAssetTypeId(''); setLocationId(''); setFromDate(''); setToDate(''); setError(''); setSuccess(''); }

  async function exportReport(kind: 'excel' | 'pdf') {
    if (fromDate && toDate && fromDate > toDate) { setError('Created from date cannot be later than created to date.'); return; }
    setBusy(kind); setError(''); setSuccess('');
    try {
      const { blob, filename } = await downloadFile(`/assets/reports/${kind}${queryString()}`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setSuccess(`${kind === 'excel' ? 'Excel' : 'PDF'} report generated successfully.`);
    } catch (e: any) { setError(e?.message ?? `Unable to generate ${kind.toUpperCase()} report. Please try again.`); }
    finally { setBusy(''); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3"><Link href="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[var(--theme-link)]"><ArrowLeft size={16}/>Back to Assets</Link><Link href="/assets/reports/templates" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary-soft)]"><Save size={16}/>Saved templates</Link></div>
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Professional reporting</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Asset Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Build a tenant-scoped inventory report, refine it with filters, then export a presentation-ready PDF or Excel workbook.</p></div><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"><FileSpreadsheet size={22}/></div></div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">{activeFilters} active filter{activeFilters === 1 ? '' : 's'}</span><span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">Tenant scoped</span><span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">PDF + Excel</span></div>
      </header>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert"><AlertCircle size={18} className="mt-0.5 shrink-0"/><div className="flex-1">{error}</div><button type="button" onClick={() => void loadFilters()} className="font-semibold underline">Retry</button></div>}
      {success && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status"><CheckCircle2 size={18}/>{success}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Filter size={18} className="text-[var(--theme-primary)]"/><h2 className="font-semibold text-slate-950">Report filters</h2></div><p className="mt-1 text-xs text-slate-500">Leave a field empty to include all matching records.</p></div><button type="button" onClick={clearFilters} disabled={!activeFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Clear filters</button></div>
        {loadingFilters ? <div className="grid gap-4 p-6 md:grid-cols-2">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : <div className="grid gap-4 p-6 md:grid-cols-2">
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="field h-11 w-full"><option value="">All statuses</option>{STATES.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Company</span><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="field h-11 w-full"><option value="">All companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Asset type</span><select value={assetTypeId} onChange={(e) => setAssetTypeId(e.target.value)} className="field h-11 w-full"><option value="">All asset types</option>{assetTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Location ID</span><input value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="Optional location ID" className="field h-11 w-full"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Created from</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="field h-11 w-full"/></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Created to</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="field h-11 w-full"/></label>
        </div>}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-slate-500">{activeFilters ? `Your export will use ${activeFilters} filter${activeFilters === 1 ? '' : 's'}.` : 'No filters selected — the report will include the full tenant inventory.'}</div><div className="flex flex-wrap gap-3 sm:justify-end"><button type="button" onClick={() => void exportReport('pdf')} disabled={!!busy || loadingFilters} className="ui-interactive inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary-soft)] disabled:opacity-60"><FileText size={17}/>{busy === 'pdf' ? 'Generating…' : 'Generate PDF'}</button><button type="button" onClick={() => void exportReport('excel')} disabled={!!busy || loadingFilters} className="ui-interactive inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"><Download size={17}/>{busy === 'excel' ? 'Generating…' : 'Generate Excel'}</button></div></div>
      </section>
    </div>
  );
}
