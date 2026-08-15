'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckSquare, Printer, RefreshCw, Search, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import AssetLabel from '../../../../components/assets/AssetLabel';

type Asset = { id: string; assetNumber: string; assetType?: { name?: string }; model?: string; serialNumber?: string; location?: { name?: string } | null; locationId?: string };
type LabelSize = 'compact' | 'standard' | 'large';
type LabelTemplate = 'standard' | 'compact';

type SearchAsset = { id: string; assetNumber: string; status?: string; assetTypeId?: string };

export default function AssetLabelsPage() {
  const searchParams = useSearchParams();
  const initialIds = useMemo(() => Array.from(new Set((searchParams.get('ids') ?? '').split(',').map((value) => value.trim()).filter(Boolean))).slice(0, 100), [searchParams]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchResults, setSearchResults] = useState<SearchAsset[]>([]);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState<LabelSize>('standard');
  const [template, setTemplate] = useState<LabelTemplate>('standard');
  const [columns, setColumns] = useState(3);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setSelectedIds(initialIds); }, [initialIds]);

  useEffect(() => {
    let cancelled = false;
    async function loadSelected() {
      if (!selectedIds.length) { setAssets([]); return; }
      setLoading(true); setError(null);
      try {
        const rows = await Promise.all(selectedIds.slice(0, 100).map((id) => apiFetch(`/assets/${id}`)));
        if (!cancelled) setAssets(rows.filter(Boolean));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load selected assets.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSelected();
    return () => { cancelled = true; };
  }, [selectedIds]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try { const rows = await apiFetch(`/assets/search?q=${encodeURIComponent(query.trim())}`); setSearchResults(Array.isArray(rows) ? rows : []); }
        catch { setSearchResults([]); }
        finally { setSearching(false); }
      })();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (size === 'compact') setColumns(4);
    else if (size === 'large') setColumns(2);
    else if (columns !== 2 && columns !== 3) setColumns(3);
  }, [size]);

  function toggleAsset(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length >= 100 ? current : [...current, id]);
  }

  function clearAll() { setSelectedIds([]); }

  const sheetClass = size === 'compact' ? 'print-sheet-compact' : size === 'large' ? 'print-sheet-large' : columns === 2 ? 'print-sheet-2col' : 'print-sheet';
  const selectedSet = new Set(selectedIds);

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><Link href="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/>Back to assets</Link><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Asset label printing</h1><p className="mt-2 text-sm text-slate-500">Search or select up to 100 assets, then print QR + Code 128 labels.</p></div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><span>Template</span><select value={template} onChange={(e) => setTemplate(e.target.value as LabelTemplate)} className="border-0 bg-transparent p-0 text-xs font-semibold outline-none"><option value="standard">Standard</option><option value="compact">Compact</option></select></label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><span>Size</span><select value={size} onChange={(e) => setSize(e.target.value as LabelSize)} className="border-0 bg-transparent p-0 text-xs font-semibold outline-none"><option value="compact">2 × 1 in</option><option value="standard">3 × 2 in</option><option value="large">4 × 2 in</option></select></label>
        {size === 'standard' && <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><span>Columns</span><select value={columns} onChange={(e) => setColumns(Number(e.target.value))} className="border-0 bg-transparent p-0 text-xs font-semibold outline-none"><option value={2}>2</option><option value={3}>3</option></select></label>}
        <button onClick={() => window.print()} disabled={loading || !assets.length} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Printer size={16}/>Print {assets.length || ''} labels</button>
      </div>
    </div>

    <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full max-w-2xl">
          <label className="relative block"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by asset number, type, or status" className="field h-11 pl-9" aria-label="Search assets for labels"/></label>
          {query.trim() && <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">{searching ? <div className="px-4 py-3 text-sm text-slate-500">Searching…</div> : searchResults.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">No matching assets.</div> : searchResults.map((item) => <button key={item.id} type="button" onClick={() => toggleAsset(item.id)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"><span><span className="font-semibold text-slate-900">{item.assetNumber}</span><span className="ml-2 text-xs text-slate-500">{item.status ?? ''}</span></span><span className={`text-xs font-semibold ${selectedSet.has(item.id) ? 'text-[var(--theme-link)]' : 'text-slate-400'}`}>{selectedSet.has(item.id) ? 'Selected' : 'Add'}</span></button>)}</div>}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckSquare size={16} className="text-[var(--theme-link)]"/>{selectedIds.length}/100 selected{selectedIds.length > 0 && <button onClick={clearAll} className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"><X size={13}/>Clear</button>}</div>
      </div>
    </section>

    {error && <div role="alert" className="no-print rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading ? <div className="no-print flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><RefreshCw className="animate-spin" size={16}/>Loading selected assets…</div> : !assets.length ? <div className="no-print rounded-2xl border border-slate-200 bg-white p-10 text-center"><p className="font-semibold text-slate-900">No assets selected</p><p className="mt-1 text-sm text-slate-500">Search above to add assets to the print sheet.</p></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none"><div className={`print-sheet ${sheetClass}`}>
      {assets.map((asset) => <AssetLabel key={asset.id} assetNumber={asset.assetNumber} assetId={asset.id} assetType={asset.assetType?.name} model={asset.model} serialNumber={asset.serialNumber} location={asset.location?.name} showControls={false} printable initialSize={size} initialTemplate={template} />)}
    </div></div>}
  </div>;
}
