'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';
import RoleScopeEditor from '../../../components/rbac/RoleScopeEditor';
import { PermissionChip, PermissionPickerItem, permissionMeta } from '../../../components/rbac/PermissionPresentation';

type Permission = { id: string; key: string };
type RolePermission = { permissionId: string; permissionKey: string };
type RoleScope = { id?: string; scopeType: 'TENANT' | 'COMPANY' | 'LOCATION'; companyId?: string | null; locationId?: string | null };
type Role = { id: string; name: string; isSystem: boolean; permissions: RolePermission[]; scopes: RoleScope[] };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [name, setName] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([apiFetch('/roles'), apiFetch('/roles/permissions')]);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setPermissions(Array.isArray(permsData) ? permsData : []);
    } catch (err: any) { setError(err?.message ?? 'Unable to load roles.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const group = permissionMeta(permission.key).group;
      const list = groups.get(group) ?? [];
      list.push(permission);
      groups.set(group, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((role) => `${role.name} ${role.permissions.map((p) => permissionMeta(p.permissionKey).label).join(' ')}`.toLowerCase().includes(q));
  }, [roles, query]);

  function togglePermission(key: string) { setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); }

  async function createRole(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    try {
      await apiFetch('/roles', { method: 'POST', body: JSON.stringify({ name: name.trim(), permissionKeys: selectedKeys }) });
      setName(''); setSelectedKeys([]); await load();
    } catch (err: any) { setError(err?.message ?? 'Unable to create role.'); }
  }

  return <div className="mx-auto max-w-[1300px] space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Access control</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Roles & permissions</h1><p className="mt-2 text-sm text-slate-500">Define what people can do and where those permissions apply.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button>
    </div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Plus size={17} className="text-[var(--theme-link)]"/><h2 className="font-semibold text-slate-950">Create role</h2></div>
        <form onSubmit={createRole} className="mt-5 space-y-4">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--theme-link)] focus:ring-2 focus:ring-[var(--theme-primary-soft)]"/>
          <div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permissions</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{selectedKeys.length} selected</span></div><div className="max-h-[460px] space-y-4 overflow-y-auto pr-1">{groupedPermissions.map(([group, groupPermissions]) => <div key={group} className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">{group}</p><span className="text-[11px] text-slate-400">{groupPermissions.length}</span></div><div className="space-y-2">{groupPermissions.map((permission) => <PermissionPickerItem key={permission.id} permissionKey={permission.key} selected={selectedKeys.includes(permission.key)} onToggle={() => togglePermission(permission.key)}/>)}</div></div>)}</div></div>
          <button disabled={!name.trim() || !selectedKeys.length} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={16}/>Create role</button>
        </form>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles or capabilities" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[var(--theme-link)]"/></div><span className="text-xs text-slate-500">{filtered.length} roles</span></div>
        {loading ? <div className="space-y-3 p-5">{[1,2,3,4].map((n) => <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-100"/>)}</div> : filtered.length === 0 ? <div className="p-14 text-center"><ShieldCheck className="mx-auto text-slate-300" size={36}/><p className="mt-3 font-semibold text-slate-800">No roles found</p></div> : <div className="divide-y divide-slate-100">{filtered.map((role) => <div key={role.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-950">{role.name}</p><p className="mt-1 text-xs text-slate-500">{role.permissions.length} permissions</p></div>{role.isSystem && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Built-in</span>}</div><div className="mt-4 flex flex-wrap gap-2">{role.permissions.length ? role.permissions.map((permission) => <PermissionChip key={permission.permissionId} permissionKey={permission.permissionKey}/>) : <span className="text-sm text-slate-400">No permissions</span>}</div><RoleScopeEditor roleId={role.id} initialScopes={role.scopes ?? []} onSaved={() => void load()}/></div>)}</div>}
      </section>
    </div>
  </div>;
}
