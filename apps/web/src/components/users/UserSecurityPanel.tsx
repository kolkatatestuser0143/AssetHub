'use client';

import { useEffect, useState } from 'react';
import { Monitor, RefreshCw, ShieldAlert, Smartphone, XCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

type Session = {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  lastSeenAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
};

type LoginEvent = {
  id: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  occurredAt?: string;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function shortAgent(agent?: string) {
  if (!agent) return 'Unknown device';
  if (/mobile|android|iphone|ipad/i.test(agent)) return 'Mobile device';
  if (/windows/i.test(agent)) return 'Windows';
  if (/macintosh|mac os/i.test(agent)) return 'macOS';
  if (/linux/i.test(agent)) return 'Linux';
  return 'Browser / device';
}

export default function UserSecurityPanel({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sessionData, historyData] = await Promise.all([
        apiFetch(`/users/${userId}/sessions`),
        apiFetch(`/users/${userId}/login-history`),
      ]);
      setSessions(Array.isArray(sessionData) ? sessionData : []);
      setLoginHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load user security activity.');
      setSessions([]);
      setLoginHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [userId]);

  async function revoke(sessionId: string) {
    setRevoking(sessionId);
    setError(null);
    try {
      await apiFetch(`/users/${userId}/sessions/${sessionId}/revoke`, { method: 'PATCH' });
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to revoke session.');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-950">Security activity</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Review active sessions and authentication history.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Monitor size={16} className="text-slate-500" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Active sessions</h3>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No active sessions.</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><Smartphone size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{shortAgent(session.userAgent)}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{session.ipAddress || 'Unknown IP'}</p>
                        <p className="mt-1 text-xs text-slate-400">Last seen {formatDate(session.lastSeenAt)}</p>
                      </div>
                    </div>
                    {session.revokedAt ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Revoked</span>
                    ) : (
                      <button type="button" onClick={() => void revoke(session.id)} disabled={revoking === session.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                        <XCircle size={14} /> {revoking === session.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-slate-500" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Login history</h3>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : loginHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No login history available.</div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {loginHistory.map((event) => (
                <div key={event.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${event.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <p className={`text-sm font-semibold ${event.success ? 'text-emerald-700' : 'text-red-700'}`}>{event.success ? 'Successful login' : 'Failed login'}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{event.ipAddress || 'Unknown IP'} · {shortAgent(event.userAgent)}</p>
                      {!event.success && event.reason && <p className="mt-1 text-xs text-red-600">Reason: {event.reason}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(event.occurredAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
