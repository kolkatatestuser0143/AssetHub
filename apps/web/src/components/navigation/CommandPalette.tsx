'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Boxes, Command, FileText, LayoutDashboard, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

const NAV_ITEMS = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/assets', 'Assets', Boxes],
  ['/users', 'Users', Users],
  ['/roles', 'Roles & permissions', ShieldCheck],
  ['/reports', 'Reports', FileText],
  ['/settings', 'Settings', Settings],
] as const;

type AssetRow = { id: string; assetNumber: string; status: string; assetType?: { name?: string } };

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetRow[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || assets.length) return;
    void apiFetch('/assets').then((data) => setAssets(Array.isArray(data) ? data : [])).catch(() => setAssets([]));
  }, [open, assets.length]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return { nav: NAV_ITEMS.slice(0, 5), assets: [] as AssetRow[] };
    return {
      nav: NAV_ITEMS.filter(([, label]) => label.toLowerCase().includes(needle)),
      assets: assets.filter((asset) => `${asset.assetNumber} ${asset.status} ${asset.assetType?.name ?? ''}`.toLowerCase().includes(needle)).slice(0, 8),
    };
  }, [query, assets]);

  const go = (href: string) => { setOpen(false); setQuery(''); router.push(href); };
  if (!open) return <button aria-label="Open command palette" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 hidden items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur lg:flex"><Command size={14}/>⌘K</button>;

  return <div className="fixed inset-0 z-[80] bg-slate-950/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Search AssetHub">
    <div className="mx-auto mt-[10vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4"><Search size={18} className="text-slate-400"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages or assets…" className="h-14 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"/><kbd className="rounded-md border bg-slate-50 px-2 py-1 text-[10px] text-slate-500">ESC</kbd><button aria-label="Close command palette" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={17}/></button></div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Navigation</p>
        {matches.nav.map(([href, label, Icon]) => <button key={href} onClick={() => go(href)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-50 ${pathname === href ? 'bg-slate-50 font-semibold' : ''}`}><Icon size={17} className="text-[var(--theme-link)]"/><span className="flex-1">{label}</span></button>)}
        {matches.assets.length > 0 && <><p className="mt-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Assets</p>{matches.assets.map((asset) => <Link key={asset.id} href={`/assets/${asset.id}`} onClick={() => { setOpen(false); setQuery(''); }} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"><Boxes size={17} className="text-[var(--theme-link)]"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{asset.assetNumber}</span><span className="block text-xs text-slate-500">{asset.assetType?.name ?? 'Asset'} · {asset.status}</span></span></Link>)}</>}
        {query && !matches.nav.length && !matches.assets.length && <div className="p-10 text-center"><Search className="mx-auto text-slate-300" size={30}/><p className="mt-3 font-semibold text-slate-800">No matches</p><p className="mt-1 text-xs text-slate-500">Try an asset number or page name.</p></div>}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400"><span>Command palette</span><span>Ctrl/⌘ + K</span></div>
    </div>
  </div>;
}
