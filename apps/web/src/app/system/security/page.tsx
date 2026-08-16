'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Globe2, LogOut, RefreshCw, Search, ShieldAlert, ShieldCheck, Smartphone, XCircle } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type Session = { id: string; userId: string; email: string; name: string; isActive: boolean; ipAddress?: string | null; userAgent?: string | null; createdAt: string; lastSeenAt: string; expiresAt: string };
type Login = { id: string; userId: string; email: string; name: string; success: boolean; reason?: string | null; ipAddress?: string | null; userAgent?: string | null; occurredAt: string };

const ago = (value: string) => { const ms = Date.now() - new Date(value).getTime(); if (ms < 60_000) return 'just now'; if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`; if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`; return `${Math.floor(ms / 86_400_000)}d ago`; };
const browser = (ua?: string | null) => { if (!ua) return 'Unknown browser'; if (/edg/i.test(ua)) return 'Microsoft Edge'; if (/chrome/i.test(ua)) return 'Chrome'; if (/firefox/i.test(ua)) return 'Firefox'; if (/safari/i.test(ua)) return 'Safari'; return 'Browser'; };

export default function SystemSecurityPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logins, setLogins] = useState<Login[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showFailures, setShowFailures] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const [sessionData, loginData] = await Promise.all([systemFetch('/system/security/sessions'), systemFetch('/system/security/login-history')]);
      setSessions(Array.isArray(sessionData) ? sessionData : []);
      setLogins(Array.isArray(loginData?.items) ? loginData.items : []);
    } catch (e: any) { setError(e?.message ?? 'Unable to load security data.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filteredSessions = useMemo(() => { const q = query.trim().toLowerCase(); return sessions.filter((s) => !q || [s.email, s.name, s.ipAddress, s.userAgent].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))); }, [sessions, query]);
  const filteredLogins = useMemo(() => logins.filter((x) => !showFailures || !x.success), [logins, showFailures]);
  const failures = logins.filter((x) => !x.success).length;
  const uniqueUsers = new Set(sessions.map((s) => s.userId)).size;
  const uniqueIps = new Set(sessions.map((s) => s.ipAddress).filter(Boolean)).size;

  async function revoke(id: string) {
    if (!window.confirm('Revoke this active session? The administrator will need to sign in again.')) return;
    setBusy(id); setError('');
    try { await systemFetch(`/system/security/sessions/${id}/revoke`, { method: 'POST' }); await load(); }
    catch (e: any) { setError(e?.message ?? 'Unable to revoke session.'); }
    finally { setBusy(null); }
  }

  async function revokeUser(userId: string, email: string) {
    if (!window.confirm(`Revoke all other sessions for ${email}?`)) return;
    setBusy(`user:${userId}`); setError('');
    try { await systemFetch(`/system/security/users/${userId}/revoke-sessions`, { method: 'POST' }); await load(); }
    catch (e: any) { setError(e?.message ?? 'Unable to revoke sessions.'); }
    finally { setBusy(null); }
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Security center</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Sessions & authentication</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Monitor real System Admin sessions, revoke compromised access and investigate successful or failed administrator logins.</p></div>
      <button onClick={() => void load()} disabled={loading} className="ui-interactive inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button>
    </header>

    {error && <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<ShieldCheck size={18}/>} label="Active sessions" value={sessions.length} hint="Unrevoked, unexpired system sessions" />
      <Metric icon={<Smartphone size={18}/>} label="Administrators online" value={uniqueUsers} hint="Unique system users with active sessions" />
      <Metric icon={<Globe2 size={18}/>} label="Source IPs" value={uniqueIps} hint="Unique active-session addresses" />
      <Metric icon={<ShieldAlert size={18}/>} label="Failed logins" value={failures} hint="From the latest 500 login records" danger={failures > 0} />
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold text-slate-950">Active sessions</h2><p className="mt-1 text-xs text-slate-500">Only sessions belonging to System Admin accounts are shown.</p></div><div className="relative w-full md:max-w-sm"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} className="field h-10 w-full pl-9" placeholder="Search administrator, IP, browser…" /></div></div>
      {loading ? <div className="space-y-3 p-5">{[1,2,3,4].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100"/>)}</div> : filteredSessions.length === 0 ? <Empty icon={<ShieldCheck size={32}/>} title="No active sessions" text="There are no unrevoked System Admin sessions matching your search."/> : <div className="divide-y divide-slate-100">{filteredSessions.map((session) => <div key={session.id} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"><Smartphone size={18}/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{session.name}</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span></div><p className="mt-1 truncate text-sm text-slate-500">{session.email}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>{browser(session.userAgent)}</span><span>{session.ipAddress ?? 'Unknown IP'}</span><span>Last seen {ago(session.lastSeenAt)}</span><span>Expires {new Date(session.expiresAt).toLocaleString()}</span></div></div></div><div className="flex shrink-0 gap-2"><button onClick={() => void revokeUser(session.userId, session.email)} disabled={busy === `user:${session.userId}`} className="ui-interactive rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{busy === `user:${session.userId}` ? 'Revoking…' : 'Revoke other sessions'}</button><button onClick={() => void revoke(session.id)} disabled={busy === session.id} className="ui-interactive inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><LogOut size={14}/>{busy === session.id ? 'Revoking…' : 'Revoke'}</button></div></div></div>)}</div>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-950">Login history</h2><p className="mt-1 text-xs text-slate-500">Authentication attempts recorded by the API.</p></div><button onClick={() => setShowFailures((v) => !v)} className={`ui-interactive inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${showFailures ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700'}`}>{showFailures ? <XCircle size={14}/> : <AlertTriangle size={14}/>} {showFailures ? 'Showing failures' : 'Show failures only'}</button></div>
      {loading ? <div className="space-y-3 p-5">{[1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : filteredLogins.length === 0 ? <Empty icon={<Clock3 size={32}/>} title="No login records" text="No authentication attempts match the current filter."/> : <div className="divide-y divide-slate-100">{filteredLogins.slice(0, 100).map((item) => <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1.2fr_1fr_auto] md:items-center"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${item.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{item.success ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}</span><div><p className="text-sm font-semibold text-slate-900">{item.email}</p><p className="text-xs text-slate-400">{item.name}</p></div></div><div className="text-xs text-slate-500"><span className="font-medium text-slate-700">{item.success ? 'Successful sign-in' : 'Failed sign-in'}</span>{item.reason && <span> · {item.reason.replace(/_/g, ' ')}</span>}</div><div className="text-xs text-slate-500"><span>{item.ipAddress ?? 'Unknown IP'}</span><span className="mx-2">·</span><span>{browser(item.userAgent)}</span></div><time className="text-xs text-slate-400 md:text-right" dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString()}</time></div>)}</div>}
    </section>
  </div>;
}

function Metric({ icon, label, value, hint, danger = false }: { icon: React.ReactNode; label: string; value: number; hint: string; danger?: boolean }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`grid h-10 w-10 place-items-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>{icon}</div><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>; }
function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="p-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-300">{icon}</div><p className="mt-4 font-semibold text-slate-800">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div>; }
