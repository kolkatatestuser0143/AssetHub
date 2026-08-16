'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, BarChart3, Building2, CheckCircle2, CreditCard, FileSearch, RefreshCw, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { systemFetch } from '../../lib/system-api';

type Overview = { tenants?: number; users?: number; assets?: number; subscriptions?: number; [key: string]: unknown };

type Metric = { label: string; value: number | string; href: string; icon: LucideIcon; description: string };

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return <Link href={metric.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--theme-primary)]/30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30">
    <div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"><Icon className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[var(--theme-link)]" /></div>
    <p className="mt-5 text-sm font-medium text-slate-500">{metric.label}</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{metric.value}</p><p className="mt-2 text-xs text-slate-400">{metric.description}</p>
  </Link>;
}

function WorkspaceCard({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--theme-primary)]/25 hover:shadow-md"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-[var(--theme-primary-soft)] group-hover:text-[var(--theme-primary)]"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-950">{title}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div><ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[var(--theme-link)]" /></div></Link>;
}

export default function SystemDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await systemFetch('/system/overview'); setData(result); setLastUpdated(new Date()); } catch (e: any) { setError(e?.message ?? 'Unable to load platform overview.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  const metrics: Metric[] = [
    { label: 'Tenants', value: data?.tenants ?? '—', href: '/system/tenants', icon: Building2, description: 'Customer organizations on the platform' },
    { label: 'Tenant users', value: data?.users ?? '—', href: '/system/users', icon: Users, description: 'Users across all active tenants' },
    { label: 'Assets', value: data?.assets ?? '—', href: '/system/analytics', icon: ShieldCheck, description: 'Assets managed across the platform' },
    { label: 'Subscriptions', value: data?.subscriptions ?? '—', href: '/system/subscriptions', icon: CreditCard, description: 'Current tenant subscription records' },
  ];

  return <div className="space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Platform control center</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Platform overview</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Monitor tenants, subscriptions, users and platform activity from one place.</p></div><div className="flex items-center gap-3">{lastUpdated && <span className="hidden text-xs text-slate-400 sm:block">Updated {lastUpdated.toLocaleTimeString()}</span>}<button onClick={() => void load()} disabled={loading} className="ui-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div></header>
    {error && <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Unable to load platform metrics</p><p className="mt-0.5 text-red-700">{error}</p></div></div><button onClick={() => void load()} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-red-50">Try again</button></div>}
    <section aria-label="Platform metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => <MetricCard key={metric.label} metric={metric} />)}</section>
    <section><div className="mb-3"><h2 className="font-semibold text-slate-950">Operational workspaces</h2><p className="mt-1 text-xs text-slate-500">Jump directly into the areas used for daily platform operations.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <WorkspaceCard href="/system/tenants" icon={Building2} title="Tenant management" description="Provision, review and manage customer organizations." />
      <WorkspaceCard href="/system/subscriptions" icon={CreditCard} title="Subscriptions" description="Review plans, lifecycle and tenant subscription state." />
      <WorkspaceCard href="/system/audit" icon={FileSearch} title="Audit & security" description="Investigate administrative and authenticated activity." />
      <WorkspaceCard href="/system/health" icon={Activity} title="System health" description="Check platform services and infrastructure signals." />
      <WorkspaceCard href="/system/analytics" icon={BarChart3} title="Platform analytics" description="Explore aggregated platform and tenant metrics." />
      <WorkspaceCard href="/system/roles" icon={ShieldCheck} title="Roles & permissions" description="Control system administrator access boundaries." />
    </div></section>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm"><CheckCircle2 className="h-5 w-5" /></div><div><p className="font-semibold text-emerald-950">Platform control is active</p><p className="mt-1 text-sm text-emerald-800">Use the workspaces above to manage tenants, access, subscriptions and operational activity.</p></div></div></section>
  </div>;
}
