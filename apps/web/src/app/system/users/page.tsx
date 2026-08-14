'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type Role = { id: string; name: string; permissions: { permissionId: string; permissionKey: string }[] };
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleIds: string[];
  roles?: Role[];
};

export default function SystemUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        systemFetch('/system/users'),
        systemFetch('/system/roles'),
      ]);
      setItems(Array.isArray(usersResponse) ? usersResponse : []);
      setRoles(Array.isArray(rolesResponse) ? rolesResponse : []);
    } catch (e: any) {
      setError(e.message ?? 'Unable to load platform users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const roleOptions = useMemo(() => roles.map((role) => ({
    ...role,
    description: role.permissions.map((p) => p.permissionKey.replace(/^platform:/, '')).join(', '),
  })), [roles]);

  async function saveRoles(user: User, roleIds: string[]) {
    setSaving(user.id);
    setError('');
    setMessage('');
    try {
      await systemFetch(`/system/users/${user.id}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({ roleIds }),
      });
      setItems((current) => current.map((item) => item.id === user.id ? {
        ...item,
        roleIds,
        roles: roleIds.map((id) => roleOptions.find((role) => role.id === id)).filter(Boolean) as Role[],
      } : item));
      setMessage(`Roles updated for ${user.email}.`);
    } catch (e: any) {
      setError(e.message ?? 'Unable to update platform roles.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Platform</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Platform Users</h2>
        <p className="mt-2 text-sm text-slate-500">System administrator accounts and platform access.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-end border-b border-slate-100 p-4">
          <button onClick={() => void load()} disabled={loading || !!saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
            <RefreshCw className="h-4 w-4" />Refresh
          </button>
        </div>

        {loading ? <div className="p-6 text-sm text-slate-500">Loading platform users…</div> : (
          <div className="divide-y divide-slate-100">
            {items.map((u) => (
              <div key={u.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{u.firstName} {u.lastName}</p>
                  <p className="mt-1 text-sm text-slate-500">{u.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(u.roles ?? []).map((role) => (
                      <span key={role.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <ShieldCheck className="h-3.5 w-3.5" />{role.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="w-full max-w-xl space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    <span className="text-xs text-slate-400">{u.roleIds.length} role(s)</span>
                  </div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Platform roles</label>
                  <select
                    multiple
                    value={u.roleIds}
                    disabled={saving === u.id}
                    onChange={(event) => {
                      const next = Array.from(event.target.selectedOptions, (option) => option.value);
                      void saveRoles(u, next);
                    }}
                    className="min-h-36 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    {roleOptions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                  </select>
                  <p className="text-xs text-slate-400">Hold Ctrl/Cmd to select multiple roles. At least one selected role must grant console access.</p>
                </div>
              </div>
            ))}
            {!items.length && <div className="p-8 text-center text-sm text-slate-500">No platform users found.</div>}
          </div>
        )}
      </section>
    </div>
  );
}
