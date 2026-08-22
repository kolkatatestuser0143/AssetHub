'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FileText, LayoutDashboard, Loader2, Search, Settings, ShieldCheck, Users, X, SlidersHorizontal, FileKey2, ClipboardList, Boxes } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';

const NAV_ITEMS = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/assets', 'Assets', Boxes],
  ['/users', 'Users', Users],
  ['/roles', 'Roles & permissions', ShieldCheck, 'custom_roles_enabled'],
  ['/reports', 'Reports', FileText],
  ['/custom-fields', 'Custom fields', SlidersHorizontal, 'custom_fields_enabled'],
  ['/identity', 'Identity & SSO', FileKey2, 'sso_enabled'],
  ['/audit', 'Audit log', ClipboardList, 'audit_enabled'],
  ['/settings', 'Settings', Settings],
] as const;

type AssetRow = { id: string; assetNumber: string; status: string; assetType?: { name?: string } };

export default function CommandPalette() {
  const pathname = usePathname();
  const { hasFeature } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [searching, setSearching] = useState(false);

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
    if (!open) return;
    const needle = query.trim();
    if (!needle) {
      setAssets([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch(`/assets/search?q=${encodeURIComponent(needle)}`, { signal: controller.signal });
        setAssets(Array.isArray(data) ? data : []);
      } catch (error: any) {
        if (error?.name !== 'AbortError') setAssets([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const visibleNav = useMemo(() => NAV_ITEMS.filter(([, , , feature]) => !feature || hasFeature(feature)), [hasFeature]);
  const matchingNav = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? visibleNav.filter(([, label]) => label.toLowerCase().includes(needle)) : visibleNav.slice(0, 5);
  }, [query, visibleNav]);

  const close = () => { setOpen(false); setQuery(''); setAssets([]); };

  const hasResults = matchingNav.length > 0 || assets.length > 0;

  return <>
    {open ? <div className="ui-command-backdrop fixed inset-0 z-[80] bg-slate-950/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Search AssetHub">
      <div className="ui-command-panel mx-auto mt-[10vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4"><Search size={18} className="text-slate-400"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages or assets…" className="h-14 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"/><kbd className="rounded-md border bg-slate-50 px-2 py-1 text-[10px] text-slate-500">ESC</kbd><button aria-label="Close command palette" onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={17}/></button></div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Navigation</p>
          {matchingNav.map(([href, label, Icon]) => <button key={href} onClick={() => { close(); window.location.assign(href); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-50 ${pathname === href ? 'bg-slate-50 font-semibold' : ''}`}><Icon size={17} className="text-[var(--theme-link)]"/><span className="flex-1">{label}</span></button>)}
          {query.trim() && <p className="mt-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Assets</p>}
          {searching && <div className="flex items-center gap-2 px-3 py-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin"/>Searching assets…</div>}
          {!searching && assets.map((asset) => <Link key={asset.id} href={`/assets/${asset.id}`} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"><Boxes size={17} className="text-[var(--theme-link)]"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{asset.assetNumber}</span><span className="block text-xs text-slate-500">{asset.assetType?.name ?? 'Asset'} · {asset.status}</span></span></Link>)}
          {query.trim() && !searching && !hasResults && <div className="p-10 text-center"><Search className="mx-auto text-slate-300" size={30}/><p className="mt-3 font-semibold text-slate-800">No matches</p><p className="mt-1 text-xs text-slate-500">Try an asset number, status, type, or page name.</p></div>}
        </div>
      </div>
    </div> : null}
  </>;
}
