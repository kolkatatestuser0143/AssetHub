'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, RotateCcw, ShieldOff } from 'lucide-react';
import { systemFetch } from '../../../../lib/system-api';

type RevokedSubscription = {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  status: string;
  startedAt?: string;
  endsAt?: string | null;
};

export default function RevokedSubscriptionsPage() {
  const [items, setItems] = useState<RevokedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reactivating, setReactivating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await systemFetch('/system/subscriptions/revoked');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message ?? 'Unable to load revoked tenants.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function reactivate(item: RevokedSubscription) {
    setReactivating(item.tenantId);
    setError('');
    try {
      const result = await systemFetch(`/system/subscriptions/${item.tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ planId: item.planId, status: 'active', endsAt: item.endsAt ?? undefined }),
      });
      if (!result) throw new Error('Unable to reactivate subscription.');
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to reactivate subscription.');
    } finally {
      setReactivating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Platform</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Revoked Tenants</h2>
          <p className="mt-2 text-sm text-slate-500">Historical tenant subscriptions that were explicitly revoked.</p>
        </header>
        <Link href="/system/subscriptions" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Active subscriptions
        </Link>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end">
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading revoked tenants…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShieldOff className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">No revoked tenants</p>
          <p className="mt-1 text-sm text-slate-500">Revoked subscriptions will appear here and remain available for audit.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Revoked / Ended</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{item.tenantName}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{item.tenantId}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{item.planName}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.planId}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.endsAt ? new Date(item.endsAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => void reactivate(item)}
                        disabled={reactivating === item.tenantId}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {reactivating === item.tenantId ? 'Reactivating…' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
