'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type RolePermission = { permissionId: string; permissionKey: string };
type Role = { id: string; name: string; isSystem: boolean; permissions: RolePermission[] };

export default function SystemRolesPage() {
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await systemFetch('/system/roles');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message ?? 'Unable to load platform roles.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Platform</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Roles & Permissions</h2>
        <p className="mt-2 text-sm text-slate-500">Platform-level RBAC definitions and privileged permissions.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-end border-b border-slate-100 p-4">
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading roles…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No platform roles found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((role) => (
              <div key={role.id} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{role.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{role.id}</p>
                  </div>
                  {role.isSystem && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">System</span>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {role.permissions.length ? role.permissions.map((permission) => (
                    <span key={permission.permissionId} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                      <ShieldCheck className="h-3 w-3" />{permission.permissionKey}
                    </span>
                  )) : <span className="text-sm text-slate-400">No permissions</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
