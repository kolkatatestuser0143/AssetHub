'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Boxes, CheckSquare, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Eye, Plus, RefreshCw, Search, Settings2, SlidersHorizontal, Upload, X } from 'lucide-react';
import { apiFetch, downloadFile } from '../../../lib/api-client';

type AssetType = { id: string; name: string; prefix?: string };
type Asset = { id: string; assetNumber: string; status: string; createdAt?: string; assetType?: { name: string } };
type SortBy = 'assetNumber' | 'status' | 'createdAt';
type PageResponse = { items: Asset[]; pagination: { page: number; pageSize: number; total: number; totalPages: number }; sort?: { sortBy: SortBy; sortDir: 'asc' | 'desc' } };
type ColumnKey = 'asset' | 'type' | 'status' | 'created' | 'lifecycle' | 'actions';

type Preferences = {
  query: string;
  statusFilter: string;
  assetTypeFilter: string;
  density: 'comfortable' | 'compact';
  pageSize: number;
  visible: Record<ColumnKey, boolean>;
  sortBy: SortBy;
  sortDir: 'asc' | 'desc';
};

const STATES = ['REQUESTED', 'IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'LOST_STOLEN', 'RETIRED', 'DISPOSED'];
const TERMINAL = new Set(['LOST_STOLEN', 'RETIRED', 'DISPOSED']);
const STORAGE_KEY = 'assethub.assets.table.v2';
const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = { asset: true, type: true, status: true, created: true, lifecycle: true, actions: true };
const COLUMN_LABELS: Record<ColumnKey, string> = { asset: 'Asset', type: 'Type', status: 'Status', created: 'Created', lifecycle: 'Lifecycle', actions: 'Actions' };
const DEFAULT_PREFERENCES: Preferences = { query: '', statusFilter: 'ALL', assetTypeFilter: '', density: 'comfortable', pageSize: 25, visible: DEFAULT_VISIBLE, sortBy: 'createdAt', sortDir: 'desc' };

function readPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      visible: { ...DEFAULT_VISIBLE, ...(parsed.visible ?? {}) },
      pageSize: [10, 25, 50, 100].includes(Number(parsed.pageSize)) ? Number(parsed.pageSize) : 25,
      sortBy: parsed.sortBy === 'assetNumber' || parsed.sortBy === 'status' || parsed.sortBy === 'createdAt' ? parsed.sortBy : 'createdAt',
      sortDir: parsed.sortDir === 'asc' ? 'asc' : 'desc',
    };
  } catch { return DEFAULT_PREFERENCES; }
}

export default function AssetsPage() {
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]), [assetTypes, setAssetTypes] = useState<AssetType[]>([]), [selectedTypeId, setSelectedTypeId] = useState('');
  const [newTypeName, setNewTypeName] = useState(''), [newTypePrefix, setNewTypePrefix] = useState('');
  const [query, setQuery] = useState(DEFAULT_PREFERENCES.query), [statusFilter, setStatusFilter] = useState(DEFAULT_PREFERENCES.statusFilter), [assetTypeFilter, setAssetTypeFilter] = useState(DEFAULT_PREFERENCES.assetTypeFilter);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(DEFAULT_PREFERENCES.pageSize), [sortBy, setSortBy] = useState<SortBy>(DEFAULT_PREFERENCES.sortBy), [sortDir, setSortDir] = useState<'asc' | 'desc'>(DEFAULT_PREFERENCES.sortDir);
  const [pagination, setPagination] = useState<PageResponse['pagination']>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [busy, setBusy] = useState(true), [exporting, setExporting] = useState(false), [bulkBusy, setBulkBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]), [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable'), [bulkState, setBulkState] = useState('');
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE), [showColumns, setShowColumns] = useState(false);

  useEffect(() => {
    const saved = readPreferences();
    setQuery(saved.query); setStatusFilter(saved.statusFilter); setAssetTypeFilter(saved.assetTypeFilter); setDensity(saved.density); setPageSize(saved.pageSize); setSortBy(saved.sortBy); setSortDir(saved.sortDir); setVisible(saved.visible); setPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    const prefs: Preferences = { query, statusFilter, assetTypeFilter, density, pageSize, visible, sortBy, sortDir };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [preferencesReady, query, statusFilter, assetTypeFilter, density, pageSize, visible, sortBy, sortDir]);

  async function loadTypes() {
    try {
      const data = await apiFetch('/assets/types');
      const next = Array.isArray(data) ? data : [];
      setAssetTypes(next);
      if (next.length > 0 && !selectedTypeId) setSelectedTypeId(next[0].id);
    } catch (err: any) { setError(err.message ?? 'Unable to load asset types.'); }
  }

  async function loadAssets(targetPage = page) {
    if (!preferencesReady) return;
    setBusy(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(pageSize), sortBy, sortDir });
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (assetTypeFilter) params.set('assetTypeId', assetTypeFilter);
      const data: PageResponse = await apiFetch(`/assets?${params.toString()}`);
      const nextAssets = Array.isArray(data?.items) ? data.items : [];
      setAssets(nextAssets); setPagination(data?.pagination ?? { page: targetPage, pageSize, total: 0, totalPages: 1 });
      setSelected((current) => current.filter((id) => nextAssets.some((asset) => asset.id === id)));
    } catch (err: any) { setError(err.message ?? 'Unable to load inventory.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void loadTypes(); }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    const timer = window.setTimeout(() => { void loadAssets(page); }, 250);
    return () => window.clearTimeout(timer);
  }, [preferencesReady, page, pageSize, query, statusFilter, assetTypeFilter, sortBy, sortDir]);

  async function createType(event: React.FormEvent) { event.preventDefault(); setError(null); try { await apiFetch('/assets/types', { method: 'POST', body: JSON.stringify({ name: newTypeName.trim(), prefix: newTypePrefix.trim().toUpperCase() }) }); setNewTypeName(''); setNewTypePrefix(''); await loadTypes(); await loadAssets(page); } catch (err: any) { setError(err.message ?? 'Unable to create asset type.'); } }
  async function createAsset() { if (!selectedTypeId) return; setError(null); try { await apiFetch('/assets', { method: 'POST', body: JSON.stringify({ assetTypeId: selectedTypeId }) }); setPage(1); await loadAssets(1); } catch (err: any) { setError(err.message ?? 'Unable to create asset.'); } }
  async function exportExcel() { setExporting(true); setError(null); try { const { blob, filename } = await downloadFile('/assets/reports/excel'); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); } catch (err: any) { setError(err.message ?? 'Unable to generate Excel report.'); } finally { setExporting(false); } }
  async function transition(assetId: string, toState: string) { setError(null); try { await apiFetch(`/assets/${assetId}/transition`, { method: 'POST', body: JSON.stringify({ toState }) }); await loadAssets(page); } catch (err: any) { setError(err.message ?? 'Unable to update asset.'); } }
  async function bulkTransition() {
    if (!bulkState || !selected.length) return;
    if (TERMINAL.has(bulkState) && !window.confirm(`Move ${selected.length} selected assets to ${bulkState.replace('_', ' ')}? This is a sensitive lifecycle action.`)) return;
    setBulkBusy(true); setError(null); setMessage(null);
    const results = await Promise.allSettled(selected.map((id) => apiFetch(`/assets/${id}/transition`, { method: 'POST', body: JSON.stringify({ toState: bulkState, reason: `Bulk lifecycle action: ${bulkState}` }) })));
    const failed = results.filter((result) => result.status === 'rejected').length;
    setSelected([]); setBulkState(''); await loadAssets(page); setBulkBusy(false);
    if (failed) setError(`${failed} of ${results.length} assets could not be updated. Each failed asset was left unchanged.`); else setMessage(`${results.length} assets updated successfully.`);
  }
  function exportSelected() {
    const rows = [['assetId','assetNumber','status','assetType','createdAt'], ...assets.filter((asset) => selected.includes(asset.id)).map((asset) => [asset.id, asset.assetNumber, asset.status, asset.assetType?.name ?? '', asset.createdAt ?? ''])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `assethub-selected-assets-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  const allVisibleSelected = assets.length > 0 && assets.every((asset) => selected.includes(asset.id));
  const rowPad = density === 'compact' ? 'px-4 py-2.5' : 'px-5 py-4';
  function toggleAll() { setSelected(allVisibleSelected ? [] : assets.map((asset) => asset.id)); }
  function toggleOne(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function changeStatus(next: string) { setStatusFilter(next); setPage(1); setSelected([]); }
  function changeType(next: string) { setAssetTypeFilter(next); setPage(1); setSelected([]); }
  function changeSort(next: SortBy) { if (sortBy === next) setSortDir((value) => value === 'asc' ? 'desc' : 'asc'); else { setSortBy(next); setSortDir(next === 'status' ? 'asc' : 'desc'); } setPage(1); setSelected([]); }
  function sortIcon(active: boolean) { return <ChevronsUpDown size={14} className={active ? 'text-[var(--theme-link)]' : 'text-slate-300'} />; }
  function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString() : '—'; }

  return <div className="mx-auto max-w-[1400px] space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Inventory</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Assets</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Manage the tenant inventory lifecycle, identifiers, and operational state from one workspace.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void loadAssets(page)} disabled={busy} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button><Link href="/assets/transfers" className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">Transfers</Link><Link href="/assets/reports" className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><Download size={16}/>Reports</Link><button onClick={exportExcel} disabled={exporting} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><Download size={16}/>{exporting ? 'Generating…' : 'Quick Excel'}</button><Link href="/assets/import" className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><Upload size={16}/>Import</Link>{assetTypes.length > 0 && <button onClick={createAsset} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"><Plus size={16}/>New asset</button>}</div></div>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{message && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><Boxes size={17} className="text-[var(--theme-link)]"/>Asset type setup</div><form onSubmit={createType} className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><input required value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type name, e.g. Laptop" className="field h-11"/><input required value={newTypePrefix} onChange={(e) => setNewTypePrefix(e.target.value)} placeholder="Prefix, e.g. LAP" className="field h-11 uppercase"/><button className="ui-interactive inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"><Plus size={16}/>Create type</button></form>{assetTypes.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-sm font-medium text-slate-700">Create using type</label><select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className="field h-10 w-auto min-w-48">{assetTypes.map((type) => <option key={type.id} value={type.id}>{type.name}{type.prefix ? ` · ${type.prefix}` : ''}</option>)}</select></div>}</section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); setSelected([]); }} placeholder="Search asset number, type, status" className="field h-10 pl-9" aria-label="Search assets"/></div><div className="flex flex-wrap items-center gap-2"><SlidersHorizontal size={16} className="text-slate-400"/><select value={statusFilter} onChange={(e) => changeStatus(e.target.value)} className="field h-10 w-auto" aria-label="Filter by status"><option value="ALL">All statuses</option>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><select value={assetTypeFilter} onChange={(e) => changeType(e.target.value)} className="field h-10 w-auto" aria-label="Filter by asset type"><option value="">All asset types</option>{assetTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="field h-10 w-auto" aria-label="Rows per page"><option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option><option value={100}>100 / page</option></select><select value={density} onChange={(e) => setDensity(e.target.value as 'comfortable' | 'compact')} className="field h-10 w-auto" aria-label="Table density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select><div className="relative"><button type="button" onClick={() => setShowColumns((value) => !value)} className="ui-interactive inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"><Settings2 size={15}/>Columns</button>{showColumns && <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visible columns</p><button type="button" onClick={() => setVisible(DEFAULT_VISIBLE)} className="text-xs font-semibold text-[var(--theme-link)]">Reset</button></div><div className="space-y-2">{(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => <label key={key} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"><span>{COLUMN_LABELS[key]}</span><input type="checkbox" checked={visible[key]} disabled={key === 'asset'} onChange={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}/></label>)}</div></div>}</div><span className="text-xs text-slate-500">{selected.length ? `${selected.length} selected · ` : ''}{pagination.total} assets</span></div></div>

      {selected.length > 0 && <div className="sticky top-16 z-20 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckSquare size={16} className="text-[var(--theme-link)]"/>{selected.length} selected on this page</div><div className="flex flex-1 flex-wrap gap-2"><select value={bulkState} onChange={(e) => setBulkState(e.target.value)} className="field h-9 w-auto"><option value="">Change lifecycle…</option>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><button disabled={!bulkState || bulkBusy} onClick={() => void bulkTransition()} className="ui-interactive inline-flex h-9 items-center rounded-lg bg-[var(--theme-primary)] px-3 text-xs font-semibold text-white disabled:opacity-50">{bulkBusy ? 'Updating…' : 'Apply'}</button><button onClick={exportSelected} className="ui-interactive inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-semibold"><Download size={13}/>Export selected</button></div><button onClick={() => setSelected([])} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"><X size={14}/>Clear</button></div>}

      {busy ? <div className="space-y-3 p-5">{[1,2,3,4,5].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100"/>)}</div> : assets.length === 0 ? <div className="p-14 text-center"><Boxes className="mx-auto text-slate-300" size={38}/><p className="mt-4 font-semibold text-slate-800">No assets found</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p></div> : <div className="max-h-[70vh] overflow-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select visible assets" checked={allVisibleSelected} onChange={toggleAll}/></th>{visible.asset && <th className="px-5 py-3"><button type="button" onClick={() => changeSort('assetNumber')} className="inline-flex items-center gap-1.5 font-semibold">Asset {sortIcon(sortBy === 'assetNumber')}</button></th>}{visible.type && <th className="px-5 py-3">Type</th>}{visible.status && <th className="px-5 py-3"><button type="button" onClick={() => changeSort('status')} className="inline-flex items-center gap-1.5 font-semibold">Status {sortIcon(sortBy === 'status')}</button></th>}{visible.created && <th className="px-5 py-3"><button type="button" onClick={() => changeSort('createdAt')} className="inline-flex items-center gap-1.5 font-semibold">Created {sortIcon(sortBy === 'createdAt')}</button></th>}{visible.lifecycle && <th className="px-5 py-3">Lifecycle</th>}{visible.actions && <th className="px-5 py-3"/>}</tr></thead><tbody className="divide-y divide-slate-100">{assets.map((asset) => <tr key={asset.id} className={`transition hover:bg-[var(--theme-primary-soft)]/60 ${selected.includes(asset.id) ? 'bg-[var(--theme-primary-soft)]' : ''}`}><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${asset.assetNumber}`} checked={selected.includes(asset.id)} onChange={() => toggleOne(asset.id)}/></td>{visible.asset && <td className={rowPad}><Link href={`/assets/${asset.id}`} className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{asset.assetNumber}</Link><div className="font-mono text-[11px] text-slate-400">{asset.id}</div></td>}{visible.type && <td className={rowPad + ' text-slate-700'}>{asset.assetType?.name ?? '—'}</td>}{visible.status && <td className={rowPad}><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{asset.status}</span></td>}{visible.created && <td className={rowPad + ' whitespace-nowrap text-slate-600'}>{formatDate(asset.createdAt)}</td>}{visible.lifecycle && <td className={rowPad}><select defaultValue="" onChange={(e) => e.target.value && void transition(asset.id, e.target.value)} className="field h-9 w-auto min-w-32 text-xs" aria-label={`Change lifecycle for ${asset.assetNumber}`}><option value="">Change state…</option>{STATES.filter((state) => state !== asset.status).map((state) => <option key={state} value={state}>{state}</option>)}</select></td>}{visible.actions && <td className={rowPad + ' text-right'}><Link href={`/assets/${asset.id}`} className="ui-interactive inline-flex items-center gap-1 text-xs font-semibold text-[var(--theme-link)]"><Eye size={14}/>Details</Link></td>}</tr>)}</tbody></table></div>}

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span><div className="flex items-center gap-2"><button disabled={pagination.page <= 1 || busy} onClick={() => setPage((current) => Math.max(1, current - 1))} className="ui-interactive inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-semibold disabled:opacity-40"><ChevronLeft size={14}/>Previous</button><button disabled={pagination.page >= pagination.totalPages || busy} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} className="ui-interactive inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-semibold disabled:opacity-40">Next<ChevronRight size={14}/></button></div></div>
    </section>
  </div>;
}
