'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleAlert, CreditCard, Gauge, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../../../lib/api-client';

type License = {
  licensed: boolean;
  status: string;
  message?: string;
  subscriptionId?: string;
  startedAt?: string;
  endsAt?: string | null;
  plan?: { id: string; name: string } | null;
  limits?: Record<string, unknown>;
  features?: Record<string, unknown>;
  entitlements?: Record<string, unknown>;
  usage: { assets: number; users: number; companies: number };
};

function label(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function usageLimit(usage: number, limits: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const raw = limits[key];
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string' && raw.trim() && Number.isFinite(Number(raw))) return Number(raw);
  }
  return null;
}

export default function TenantLicensePage() {
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLicense(await apiFetch('/billing/license'));
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load license information.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const statusTone = useMemo(() => {
    if (!license) return 'slate';
    if (license.status === 'active') return 'emerald';
    if (license.status === 'trialing') return 'blue';
    if (license.status === 'expired' || license.status === 'past_due') return 'red';
    return 'amber';
  }, [license]);

  if (loading) {
    return <div className="mx-auto max-w-5xl space-y-5"><div className="h-5 w-24 animate-pulse rounded bg-slate-200"/><div className="h-44 animate-pulse rounded-2xl bg-slate-100"/><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-5xl space-y-5"><Link href="/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/>Back to settings</Link><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div></div>;
  }

  if (!license) return null;

  const assetLimit = usageLimit(license.usage.assets, license.limits ?? {}, ['max_assets', 'asset_limit', 'assets_limit']);
  const userLimit = usageLimit(license.usage.users, license.limits ?? {}, ['max_users', 'user_limit', 'users_limit']);
  const endDate = license.endsAt ? new Date(license.endsAt).toLocaleDateString() : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/>Back to settings</Link>

      <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Subscription</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">License & subscription</h1>
          <p className="mt-2 text-sm text-slate-500">Read-only view of your tenant plan, entitlement limits, features, and current usage.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Refresh</button>
      </header>

      {!license.licensed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex gap-3"><CircleAlert size={19} className="mt-0.5 shrink-0"/><div><p className="font-semibold">License is not currently active</p><p className="mt-1">{license.message ?? `Current status: ${license.status}.`}</p></div></div>
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><CreditCard size={20}/></div><div><p className="text-sm text-slate-500">Current plan</p><p className="mt-1 text-2xl font-bold text-slate-950">{license.plan?.name ?? 'Unassigned'}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : statusTone === 'blue' ? 'bg-blue-50 text-blue-700' : statusTone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{label(license.status)}</span></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm"><div><p className="text-slate-500">Started</p><p className="mt-1 font-semibold text-slate-900">{license.startedAt ? new Date(license.startedAt).toLocaleDateString() : '—'}</p></div><div><p className="text-slate-500">Ends</p><p className="mt-1 font-semibold text-slate-900">{endDate ?? 'No end date'}</p></div><div><p className="text-slate-500">Subscription ID</p><p className="mt-1 truncate font-mono text-xs text-slate-700">{license.subscriptionId ?? '—'}</p></div></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600"/><p className="font-semibold text-slate-950">License state</p></div><div className="mt-5 flex items-center gap-3"><CheckCircle2 size={28} className={license.licensed ? 'text-emerald-600' : 'text-slate-300'}/><div><p className="font-semibold text-slate-900">{license.licensed ? 'Entitlements active' : 'Restricted'}</p><p className="mt-1 text-xs text-slate-500">Feature access follows your assigned subscription.</p></div></div></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><Gauge size={18} className="text-blue-600"/><h2 className="font-semibold text-slate-950">Usage</h2></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <UsageCard title="Assets" current={license.usage.assets} limit={assetLimit}/>
          <UsageCard title="Users" current={license.usage.users} limit={userLimit}/>
          <UsageCard title="Companies" current={license.usage.companies} limit={usageLimit(license.usage.companies, license.limits ?? {}, ['max_companies', 'company_limit', 'companies_limit'])}/>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <KeyValueCard title="Limits" values={license.limits ?? {}} empty="No explicit limits were assigned." />
        <KeyValueCard title="Features" values={license.features ?? {}} empty="No explicit feature entitlements were assigned." />
      </section>
    </div>
  );
}

function UsageCard({ title, current, limit }: { title: string; current: number; limit: number | null }) {
  const percent = limit && limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : null;
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-xl font-bold text-slate-950">{current}</p></div><p className="text-xs font-medium text-slate-500">{limit != null ? `of ${limit}` : 'No limit set'}</p></div>{percent != null && <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : percent >= 75 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}/></div>}</div>;
}

function KeyValueCard({ title, values, empty }: { title: string; values: Record<string, unknown>; empty: string }) {
  const entries = Object.entries(values);
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">{title}</h2>{entries.length === 0 ? <p className="mt-4 text-sm text-slate-500">{empty}</p> : <dl className="mt-5 space-y-3">{entries.map(([key, value]) => <div key={key} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5"><dt className="text-sm text-slate-600">{label(key)}</dt><dd className="max-w-[55%] text-right text-sm font-semibold text-slate-900">{formatValue(value)}</dd></div>)}</dl>}</section>;
}
