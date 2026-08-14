'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { Check, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';

type Permission = { id: string; key: string };
type RolePermission = {
  permissionId?: string;
  permissionKey?: string;
  permission?: Permission | null;
};
type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissions?: RolePermission[];
};

function permissionKey(item: RolePermission): string {
  return item.permissionKey ?? item.permission?.key ?? '';
}

function permissionId(item: RolePermission, index: number): string {
  return item.permissionId ?? item.permission?.id ?? `${permissionKey(item)}-${index}`;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [name, setName] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        apiFetch('/roles'),
        apiFetch('/roles/permissions'),
      ]);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setPermissions(Array.isArray(permsData) ? permsData : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load roles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function togglePermission(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          permissionKeys: selectedKeys,
        }),
      });
      setName('');
      setSelectedKeys([]);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to create role.');
    }
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return roles.filter((role) => {
      const permissionText = (role.permissions ?? [])
        .map(permissionKey)
        .filter(Boolean)
        .join(' ');

      return `${role.name} ${permissionText}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [roles, query]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Access control
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Roles & permissions
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Define what people can view and change inside the tenant.
          </p>
        </div>

        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Plus size={17} className="text-blue-600" />
            <h2 className="font-semibold text-slate-950">Create role</h2>
          </div>

          <form onSubmit={createRole} className="mt-5 space-y-4">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Role name"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Permissions
              </p>
              <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {permissions.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">
                      {permission.key}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              disabled={!name.trim()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck size={16} />
              Create role
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles or permissions"
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              {filtered.length} roles
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center">
              <ShieldCheck className="mx-auto text-slate-300" size={36} />
              <p className="mt-3 font-semibold text-slate-800">
                No roles found
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((role) => (
                <div key={role.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {role.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-400">
                        {role.id}
                      </p>
                    </div>

                    {role.isSystem && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        System role
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(role.permissions ?? []).length ? (
                      role.permissions?.map((item, index) => {
                        const key = permissionKey(item);
                        if (!key) return null;

                        return (
                          <span
                            key={permissionId(item, index)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            <Check size={12} />
                            {key}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-sm text-slate-400">
                        No permissions
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
