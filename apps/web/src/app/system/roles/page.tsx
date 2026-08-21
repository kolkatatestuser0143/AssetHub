'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type RolePermission = { permissionId: string; permissionKey: string };
type Role = { id: string; name: string; isSystem: boolean; permissions: RolePermission[] };
type PlatformPermission = { id: string; key: string; name?: string | null; description?: string | null };

export default function SystemRolesPage() {
  const [items, setItems] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PlatformPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [rolesData, permissionsData] = await Promise.all([
        systemFetch('/system/roles'),
        systemFetch('/system/roles/permissions'),
      ]);
      setItems(Array.isArray(rolesData) ? rolesData : []);
      setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (e: any) {
      setError(e.message ?? 'Unable to load platform roles.');
      setItems([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PlatformPermission[]>();
    for (const permission of permissions) {
      const parts = permission.key.split(':');
      const group = parts[1] ? parts[1].replace(/[-_]/g, ' ') : 'platform';
      const list = groups.get(group) ?? [];
      list.push(permission);
      groups.set(group, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  function togglePermission(key: string) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function resetForm() {
    setRoleName('');
    setSelected([]);
    setCreateOpen(false);
  }

  async function createRole() {
    const name = roleName.trim();
    if (name.length < 2) {
      setError('Role name must contain at least 2 characters.');
      return;
    }
    if (!selected.length) {
      setError('Select at least one platform permission.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      await systemFetch('/system/roles', {
        method: 'POST',
        body: JSON.stringify({ name, permissionKeys: selected }),
      });
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Unable to create platform role.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Platform</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Roles & Permissions</h2>
          <p className="mt-2 text-sm text-slate-500">Platform-level RBAC definitions and privileged permissions.</p>
        </div>
        <button
          type="button"
          onClick={() => { setError(''); setCreateOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Create role
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-800">Platform roles</p>
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
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${role.isSystem ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {role.isSystem ? 'System' : 'Custom'}
                  </span>
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

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Create platform role</p>
                <p className="mt-1 text-xs text-slate-500">Custom platform roles can contain only platform permissions.</p>
              </div>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-132px)] space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="platform-role-name">Role name</label>
                <input
                  id="platform-role-name"
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="e.g. Security Operations"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Permissions</p>
                    <p className="mt-1 text-xs text-slate-500">Selected: {selected.length}</p>
                  </div>
                  <button type="button" onClick={() => setSelected(selected.length === permissions.length ? [] : permissions.map((permission) => permission.key))} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    {selected.length === permissions.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>

                <div className="mt-3 space-y-4">
                  {groupedPermissions.map(([group, groupPermissions]) => (
                    <div key={group} className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{group}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {groupPermissions.map((permission) => (
                          <label key={permission.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                            <input type="checkbox" checked={selected.includes(permission.key)} onChange={() => togglePermission(permission.key)} className="mt-1 h-4 w-4" />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-slate-800">{permission.name || permission.key}</span>
                              <span className="mt-1 block break-all font-mono text-[11px] text-slate-400">{permission.key}</span>
                              {permission.description && <span className="mt-1 block text-xs text-slate-500">{permission.description}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!permissions.length && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No platform permissions are available.</div>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={() => void createRole()} disabled={creating || !roleName.trim() || !selected.length} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {creating ? 'Creating…' : 'Create role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
