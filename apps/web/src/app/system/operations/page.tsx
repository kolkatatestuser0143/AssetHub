'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, ServerCog, XCircle } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type Job = { id?: string; name: string; state: string; attemptsMade: number; failedReason?: string | null; timestamp: number; processedOn?: number | null; finishedOn?: number | null };
type Data = { queue: string; counts: Record<string, number>; jobs: Job[] };

const label = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

export default function SystemOperationsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setData(await systemFetch('/system/operations/jobs')); }
    catch (e: any) { setError(e?.message ?? 'Unable to load background job status.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const counts = data?.counts ?? {};
  const cards = [
    ['waiting', counts.waiting ?? 0, Clock3], ['active', counts.active ?? 0, Loader2], ['failed', counts.failed ?? 0, XCircle], ['completed', counts.completed ?? 0, CheckCircle2],
  ] as const;

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Operations</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Background Jobs</h2><p className="mt-2 text-sm text-slate-500">Live BullMQ maintenance queue visibility. No simulated job metrics.</p></div>
      <button onClick={() => void load()} disabled={loading} className="ui-interactive inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-60"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Refresh</button>
    </header>

    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="font-semibold">Background jobs unavailable</p><p className="mt-1">{error}</p><button onClick={() => void load()} className="mt-3 font-semibold underline underline-offset-2">Try again</button></div></div></div>}

    {loading && !data ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200"/> )}</div> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([name, value, Icon]) => <div key={name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label(name)}</span><Icon className={`h-5 w-5 ${name === 'failed' && value > 0 ? 'text-red-500' : 'text-[var(--theme-link)]'} ${name === 'active' ? 'animate-pulse' : ''}`} /></div><p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value.toLocaleString()}</p></div>)}</div>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-slate-950">Queue activity</h3><p className="mt-1 text-xs text-slate-500">{data.queue}</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><Activity className="h-3.5 w-3.5"/>Live data</span></div>
        {data.jobs.length === 0 ? <div className="grid place-items-center px-6 py-16 text-center"><ServerCog className="h-10 w-10 text-slate-300"/><p className="mt-4 font-semibold text-slate-800">No pending or failed jobs</p><p className="mt-1 max-w-md text-sm text-slate-500">The maintenance queue is currently clear. Completed jobs are retained according to the worker configuration.</p></div> : <div className="divide-y divide-slate-100">{data.jobs.map((job) => <div key={String(job.id)} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${job.state === 'failed' ? 'bg-red-500' : job.state === 'active' ? 'bg-blue-500' : 'bg-amber-500'}`}/><p className="truncate font-semibold text-slate-900">{job.name}</p></div><p className="mt-1 text-xs text-slate-500">Job {job.id ?? '—'} · Attempts {job.attemptsMade}</p>{job.failedReason && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{job.failedReason}</p>}</div><div className="text-xs text-slate-500 lg:text-right"><p className="font-semibold uppercase tracking-wide text-slate-400">{job.state}</p><p className="mt-1">Created {new Date(job.timestamp).toLocaleString()}</p></div></div>)}</div>}
      </section>
    </>}
  </div>;
}
