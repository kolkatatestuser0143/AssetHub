'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Download, PackageCheck, RefreshCw, Search, ShieldAlert, Users, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

type Warranty = { provider?: string; expiresAt?: string };
type ReportAsset = {
  id: string;
  assetNumber?: string;
  status: string;
  assetTypeId: string;
  vendorId?: string | null;
  warranty?: Warranty | null;
};

type Report = {
  generatedAt: string;
  totals: {
    assets: number;
    assignedAssets: number;
    assignmentRecords: number;
    vendors: number;
    warranties: number;
    expiredWarranties: number;
    expiringWarranties: number;
  };
  statusCounts: Record<string, number>;
  assets: ReportAsset[];
};

const moneylessDate = (value?: string) => value ? new Date(value).toLocaleDateString() : '—';

function warrantyState(value?: Warranty | null) {
  if (!value?.expiresAt) return 'No warranty';
  const t = new Date(value.expiresAt).getTime();
  const now = Date.now();
  if (t < now) return 'Expired';
  if (t <= now + 30 * 24 * 60 * 60 * 1000) return 'Expiring soon';
  return 'Active';
}

export default function ReportsPage() {
  const { status: authStatus, hasFeature } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportsEnabled = hasFeature('advanced_reports_enabled');

  useEffect(() => {
    if (authStatus === 'authenticated' && !reportsEnabled) router.replace('/dashboard');
  }, [authStatus, reportsEnabled, router]);

  async function load() {
    if (!reportsEnabled) return;
    setBusy(true);
    setError(null);
    try {
      setReport(await apiFetch('/assets/reports/summary'));
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load reports.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (authStatus === 'authenticated' && reportsEnabled) void load(); }, [authStatus, reportsEnabled]);

  const filteredAssets = useMemo(() => {
    const list = report?.assets ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter((asset) => {
      const matchesQuery = !needle || `${asset.assetNumber ?? ''} ${asset.status} ${asset.assetTypeId} ${asset.vendorId ?? ''}`.toLowerCase().includes(needle);
      const matchesStatus = status === 'ALL' || asset.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [report, query, status]);

  const exportCsv = () => {
    if (!report) return;
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['assetId', 'assetNumber', 'status', 'assetTypeId', 'vendorId', 'warrantyProvider', 'warrantyExpiresAt', 'warrantyState'],
      ...filteredAssets.map((asset) => [asset.id, asset.assetNumber ?? '', asset.status, asset.assetTypeId, asset.vendorId ?? '', asset.warranty?.provider ?? '', asset.warranty?.expiresAt ?? '', warrantyState(asset.warranty)]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assethub-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authStatus === 'loading') return <div className="p-8 text-sm text-slate-500">Checking license…</div>;
  if (!reportsEnabled) return <div className="p-8 text-sm text-slate-500">Reports are not available on the current license.</div>;

  const statusEntries = Object.entries(report?.statusCounts ?? {}).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(1, ...statusEntries.map(([, count]) => count));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Analytics</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Live tenant inventory, assignment, lifecycle, vendor, and warranty reporting.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} />Refresh</button>
          <button onClick={exportCsv} disabled={!report || busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"><Download size={16} />Export CSV</button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total assets', report?.totals.assets ?? 0, PackageCheck],
          ['Assigned assets', report?.totals.assignedAssets ?? 0, Users],
          ['Vendors', report?.totals.vendors ?? 0, Wrench],
          ['Warranty risks', (report?.totals.expiredWarranties ?? 0) + (report?.totals.expiringWarranties ?? 0), ShieldAlert],
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon size={18} className="text-blue-600" /></div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{busy ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-600" /><h2 className="font-semibold text-slate-950">Lifecycle distribution</h2></div>
          <div className="mt-6 space-y-4">
            {statusEntries.length === 0 ? <p className="text-sm text-slate-500">No asset lifecycle data yet.</p> : statusEntries.map(([name, count]) => (
              <div key={name}>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold"><span className="text-slate-600">{name}</span><span className="text-slate-900">{count}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Warranty posture</h2><p className="mt-1 text-sm text-slate-500">Coverage risk based on the latest live warranty records.</p></div><Link href="/warranties" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Open warranties</Link></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Tracked</p><p className="mt-1 text-xl font-bold text-slate-950">{report?.totals.warranties ?? 0}</p></div>
            <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs text-amber-700">Expiring ≤ 30d</p><p className="mt-1 text-xl font-bold text-amber-900">{report?.totals.expiringWarranties ?? 0}</p></div>
            <div className="rounded-xl bg-red-50 p-4"><p className="text-xs text-red-700">Expired</p><p className="mt-1 text-xl font-bold text-red-900">{report?.totals.expiredWarranties ?? 0}</p></div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search report rows" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
          <div className="flex items-center gap-2"><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All lifecycle states</option>{Object.keys(report?.statusCounts ?? {}).map((item) => <option key={item} value={item}>{item}</option>)}</select><span className="text-xs text-slate-500">{filteredAssets.length} rows</span></div>
        </div>
        {busy ? <div className="space-y-3 p-5">{[1,2,3,4,5].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div> : filteredAssets.length === 0 ? <div className="p-14 text-center"><BarChart3 className="mx-auto text-slate-300" size={38} /><p className="mt-4 font-semibold text-slate-800">No report rows</p><p className="mt-1 text-sm text-slate-500">Adjust the search or lifecycle filter.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Lifecycle</th><th className="px-5 py-3">Asset type</th><th className="px-5 py-3">Vendor</th><th className="px-5 py-3">Warranty</th><th className="px-5 py-3">Expiry</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredAssets.map((asset) => <tr key={asset.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/assets/${asset.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{asset.assetNumber ?? asset.id}</Link></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{asset.status}</span></td><td className="px-5 py-4 font-mono text-xs text-slate-600">{asset.assetTypeId}</td><td className="px-5 py-4 font-mono text-xs text-slate-600">{asset.vendorId ?? '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${warrantyState(asset.warranty) === 'Expired' ? 'bg-red-50 text-red-700' : warrantyState(asset.warranty) === 'Expiring soon' ? 'bg-amber-50 text-amber-700' : warrantyState(asset.warranty) === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{warrantyState(asset.warranty)}</span></td><td className="px-5 py-4 text-slate-700">{moneylessDate(asset.warranty?.expiresAt)}</td></tr>)}</tbody></table></div>}
      </section>

      {report && <p className="text-xs text-slate-400">Report generated {new Date(report.generatedAt).toLocaleString()} · Data is scoped to the current tenant/company.</p>}
    </div>
  );
}
