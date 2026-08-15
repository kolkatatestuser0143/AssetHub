'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, downloadFile } from '../../../lib/api-client';
import { Boxes, ChevronRight, Download, Plus, RefreshCw, Search, SlidersHorizontal, Upload } from 'lucide-react';

type AssetType = { id: string; name: string; prefix?: string };
type Asset = { id: string; assetNumber: string; status: string; assetType: { name: string } };

const STATES = ['REQUESTED', 'IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'LOST_STOLEN', 'RETIRED', 'DISPOSED'];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrefix, setNewTypePrefix] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true); setError(null);
    try {
      const [assetData, typeData] = await Promise.all([apiFetch('/assets'), apiFetch('/assets/types')]);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setAssetTypes(Array.isArray(typeData) ? typeData : []);
      if (Array.isArray(typeData) && typeData.length > 0 && !selectedTypeId) setSelectedTypeId(typeData[0].id);
    } catch (err: any) { setError(err.message ?? 'Unable to load inventory.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []);

  async function createType(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    try { await apiFetch('/assets/types', { method: 'POST', body: JSON.stringify({ name: newTypeName.trim(), prefix: newTypePrefix.trim().toUpperCase() }) }); setNewTypeName(''); setNewTypePrefix(''); await load(); }
    catch (err: any) { setError(err.message ?? 'Unable to create asset type.'); }
  }
  async function createAsset() {
    if (!selectedTypeId) return; setError(null);
    try { await apiFetch('/assets', { method: 'POST', body: JSON.stringify({ assetTypeId: selectedTypeId }) }); await load(); }
    catch (err: any) { setError(err.message ?? 'Unable to create asset.'); }
  }
  async function exportExcel() {
    setExporting(true); setError(null);
    try { const { blob, filename } = await downloadFile('/assets/reports/excel'); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
    catch (err: any) { setError(err.message ?? 'Unable to generate Excel report.'); }
    finally { setExporting(false); }
  }
  async function transition(assetId: string, toState: string) {
    setError(null);
    try { await apiFetch(`/assets/${assetId}/transition`, { method: 'POST', body: JSON.stringify({ toState }) }); await load(); }
    catch (err: any) { setError(err.message ?? 'Unable to update asset.'); }
  }

  const filtered = useMemo(() => assets.filter((asset) => {
    const matchesQuery = `${asset.assetNumber} ${asset.assetType?.name ?? ''} ${asset.status}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [assets, query, statusFilter]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Inventory</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Assets</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Manage the tenant inventory lifecycle, identifiers, and operational state from one workspace.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button>
          <Link href="/assets/transfers" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Transfers</Link>
          <Link href="/assets/reports" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><Download size={16}/>Reports</Link>
          <button onClick={exportExcel} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><Download size={16}/>{exporting ? 'Generating…' : 'Quick Excel'}</button>
          <Link href="/assets/import" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><Upload size={16}/>Import</Link>
          {assetTypes.length > 0 && <button onClick={createAsset} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus size={16}/>New asset</button>}
        </div>
      </div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><Boxes size={17} className="text-blue-600"/>Asset type setup</div>
        <form onSubmit={createType} className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><input required value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type name, e.g. Laptop" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/><input required value={newTypePrefix} onChange={(e) => setNewTypePrefix(e.target.value)} placeholder="Prefix, e.g. LAP" className="h-11 rounded-xl border border-slate-200 px-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={16}/>Create type</button></form>
        {assetTypes.length > 0 && <div className="mt-4 flex items-center gap-3"><label className="text-sm font-medium text-slate-700">Create using type</label><select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">{assetTypes.map((type) => <option key={type.id} value={type.id}>{type.name}{type.prefix ? ` · ${type.prefix}` : ''}</option>)}</select></div>}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between"><div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset number, type, status" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></div><div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-slate-400"/><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="ALL">All statuses</option>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><span className="text-xs text-slate-500">{filtered.length} of {assets.length}</span></div></div>
        {busy ? <div className="space-y-3 p-5">{[1,2,3,4,5].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100"/> )}</div> : filtered.length === 0 ? <div className="p-14 text-center"><Boxes className="mx-auto text-slate-300" size={38}/><p className="mt-4 font-semibold text-slate-800">No assets found</p><p className="mt-1 text-sm text-slate-500">Create an asset type and then create the first asset.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Lifecycle</th><th className="px-5 py-3"/></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((asset) => <tr key={asset.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/assets/${asset.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{asset.assetNumber}</Link><div className="font-mono text-[11px] text-slate-400">{asset.id}</div></td><td className="px-5 py-4 text-slate-700">{asset.assetType?.name ?? '—'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{asset.status}</span></td><td className="px-5 py-4"><select defaultValue="" onChange={(e) => e.target.value && transition(asset.id, e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"><option value="">Change state…</option>{STATES.filter((state) => state !== asset.status).map((state) => <option key={state} value={state}>{state}</option>)}</select></td><td className="px-5 py-4 text-right"><Link href={`/assets/${asset.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Details<ChevronRight size={14}/></Link></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
