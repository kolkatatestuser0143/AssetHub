'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';
import { PermissionChip, PermissionPickerItem, permissionMeta } from '../../../components/rbac/PermissionPresentation';

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
    setLoading(true); setError('');
    try {
      const [rolesData, permissionsData] = await Promise.all([systemFetch('/system/roles'), systemFetch('/system/roles/permissions')]);
      setItems(Array.isArray(rolesData) ? rolesData : []); setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (e: any) { setError(e.message ?? 'Unable to load platform roles.'); setItems([]); setPermissions([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PlatformPermission[]>();
    for (const permission of permissions) { const group = permissionMeta(permission.key).group; const list = groups.get(group) ?? []; list.push(permission); groups.set(group, list); }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  function togglePermission(key: string) { setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); }
  function resetForm() { setRoleName(''); setSelected([]); setCreateOpen(false); }
  async function createRole() {
    const name = roleName.trim();
    if (name.length < 2) return setError('Role name must contain at least 2 characters.');
    if (!selected.length) return setError('Select at least one platform permission.');
    setCreating(true); setError('');
    try { await systemFetch('/system/roles', { method: 'POST', body: JSON.stringify({ name, permissionKeys: selected }) }); resetForm(); await load(); }
    catch (e: any) { setError(e.message ?? 'Unable to create platform role.'); }
    finally { setCreating(false); }
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Platform administration</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Roles & Permissions</h2><p className="mt-2 text-sm text-slate-500">Control access to tenants, billing, security, support and platform operations.</p></div><button type="button" onClick={() => { setError(''); setCreateOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"><Plus className="h-4 w-4"/>Create role</button></header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4"><div><p className="text-sm font-semibold text-slate-800">Platform roles</p><p className="mt-1 text-xs text-slate-500">{items.length} roles configured</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw className={loading ? 'animate-spin' : ''} size={15}/>Refresh</button></div>
      {loading ? <div className="p-6 text-sm text-slate-500">Loading roles…</div> : items.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No platform roles found.</div> : <div className="divide-y divide-slate-100">{items.map((role) => <div key={role.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><p className="font-semibold text-slate-950">{role.name}</p>{role.isSystem ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Built-in</span> : <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">Custom</span>}</div><p className="mt-1 text-xs text-slate-500">{role.permissions.length} permissions</p></div></div><div className="mt-4 flex flex-wrap gap-2">{role.permissions.length ? role.permissions.map((permission) => <PermissionChip key={permission.permissionId} permissionKey={permission.permissionKey}/>) : <span className="text-sm text-slate-400">No permissions</span>}</div></div>)}</div>}
    </section>
    {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-sm font-semibold text-slate-950">Create platform role</p><p className="mt-1 text-xs text-slate-500">Choose a clear set of platform capabilities. Technical permission keys remain hidden behind friendly labels.</p></div><button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18}/></button></div><div className="max-h-[calc(92vh-132px)] overflow-y-auto p-5"><div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4"><label className="text-sm font-semibold text-slate-800" htmlFor="platform-role-name">Role name</label><input id="platform-role-name" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Security Operations" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"/></div><div className="mt-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-800">Capabilities</p><p className="mt-1 text-xs text-slate-500">{selected.length} selected</p></div><button type="button" onClick={() => setSelected(selected.length === permissions.length ? [] : permissions.map((permission) => permission.key))} className="text-xs font-semibold text-violet-700">{selected.length === permissions.length ? 'Clear all' : 'Select all'}</button></div><div className="mt-3 grid gap-4 lg:grid-cols-2">{groupedPermissions.map(([group, groupPermissions]) => <div key={group} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">{group}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{groupPermissions.length}</span></div><div className="space-y-2">{groupPermissions.map((permission) => <PermissionPickerItem key={permission.key} permissionKey={permission.key} selected={selected.includes(permission.key)} onToggle={() => togglePermission(permission.key)}/>)}</div></div>)}</div></div><div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4"><button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={() => void createRole()} disabled={creating || !roleName.trim() || !selected.length} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creating ? 'Creating…' : 'Create role'}</button></div></div></div>}
  </div>;
}
