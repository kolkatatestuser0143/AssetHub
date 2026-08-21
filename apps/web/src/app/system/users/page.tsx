'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, KeyRound, Plus, RefreshCw, Search, ShieldCheck, UserCheck, UserPlus, UserX, Users, X } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';
import { PermissionChip } from '../../../components/rbac/PermissionPresentation';

type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: { permissionId: string; permissionKey: string }[];
};

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleIds: string[];
};

type CreatedUser = User & { forcePasswordReset: boolean; temporaryPassword: string };

export default function SystemUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', roleIds: [] as string[] });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [usersData, rolesData] = await Promise.all([systemFetch('/system/users'), systemFetch('/system/roles')]);
      setItems(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load platform users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter((user) => {
    const text = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (status === 'all' || (status === 'active' ? user.isActive : !user.isActive));
  }), [items, query, status]);

  const active = items.filter((user) => user.isActive).length;

  function toggleRole(roleId: string) {
    setForm((current) => ({ ...current, roleIds: current.roleIds.includes(roleId) ? current.roleIds.filter((id) => id !== roleId) : [...current.roleIds, roleId] }));
  }

  function resetCreate() {
    setForm({ email: '', firstName: '', lastName: '', roleIds: [] });
    setCreateOpen(false);
    setCreatedUser(null);
  }

  async function createUser() {
    const email = form.email.trim();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!email || !firstName || !lastName) {
      setError('Email, first name and last name are required.');
      return;
    }
    if (!form.roleIds.length) {
      setError('Select at least one platform role.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const created = await systemFetch('/system/users', { method: 'POST', body: JSON.stringify({ email, firstName, lastName, roleIds: form.roleIds }) });
      setCreatedUser(created as CreatedUser);
      await load();
      setForm({ email: '', firstName: '', lastName: '', roleIds: [] });
    } catch (e: any) {
      setError(e?.message ?? 'Unable to create platform user.');
    } finally {
      setCreating(false);
    }
  }

  async function saveRoles(userId: string, roleIds: string[]) {
    setSaving(true);
    setError('');
    try {
      await systemFetch(`/system/users/${userId}/roles`, { method: 'PATCH', body: JSON.stringify({ roleIds }) });
      setItems((current) => current.map((user) => user.id === userId ? { ...user, roleIds } : user));
      setEditing(null);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to update platform access.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-link,#2563eb)]">Platform</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Platform Users</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">System administrator accounts and privileged platform access. These users are separate from tenant employees.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          <button onClick={() => { setError(''); setCreatedUser(null); setCreateOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
            <Plus className="h-4 w-4" />Create platform user
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<Users size={18} />} label="Total administrators" value={items.length} />
        <Metric icon={<UserCheck size={18} />} label="Active" value={active} />
        <Metric icon={<UserX size={18} />} label="Inactive" value={items.length - active} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--theme-link,#2563eb)]" aria-label="Search platform users" />
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <FilterButton active={status === 'all'} onClick={() => setStatus('all')}>All</FilterButton>
            <FilterButton active={status === 'active'} onClick={() => setStatus('active')}>Active</FilterButton>
            <FilterButton active={status === 'inactive'} onClick={() => setStatus('inactive')}>Inactive</FilterButton>
          </div>
        </div>

        {loading ? <div className="divide-y divide-slate-100">{[1, 2, 3, 4].map((value) => <div key={value} className="h-20 animate-pulse bg-slate-50/70" />)}</div> : filtered.length === 0 ? <EmptyState /> : <div className="divide-y divide-slate-100">
          {filtered.map((user) => <div key={user.id} className="p-5 transition hover:bg-slate-50">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><ShieldCheck size={18} /></div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{user.firstName} {user.lastName}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">{user.roleIds.length} role{user.roleIds.length === 1 ? '' : 's'}</span>
                <button onClick={() => setEditing(editing === user.id ? null : user.id)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Manage access</button>
              </div>
            </div>
            {user.roleIds.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{user.roleIds.map((roleId) => {
              const role = roles.find((item) => item.id === roleId);
              return <span key={roleId} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{role?.name ?? 'Assigned role'}</span>;
            })}</div>}
            {editing === user.id && <RoleEditor user={user} roles={roles} saving={saving} onCancel={() => setEditing(null)} onSave={(roleIds) => void saveRoles(user.id, roleIds)} />}
          </div>)}
        </div>}
      </section>

      {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div><p className="text-base font-semibold text-slate-950">Create platform user</p><p className="mt-1 text-xs text-slate-500">Create a system administrator account and assign platform access.</p></div>
            <button type="button" onClick={resetCreate} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>

          {createdUser ? <div className="space-y-5 p-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><UserCheck size={18} /></div><div><p className="font-semibold text-emerald-900">Platform user created</p><p className="mt-1 text-sm text-emerald-800">The user must change this temporary password during first login.</p></div></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CredentialCard label="Email" value={createdUser.email} />
              <CredentialCard label="Temporary password" value={createdUser.temporaryPassword} copyable />
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-start gap-2"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" /><p>Show or copy the temporary password now. It is returned only at creation time.</p></div></div>
            <div className="flex justify-end"><button onClick={resetCreate} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Done</button></div>
          </div> : <div className="max-h-[calc(92vh-76px)] space-y-5 overflow-y-auto p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={form.firstName} onChange={(value) => setForm((current) => ({ ...current, firstName: value }))} placeholder="Aditi" />
              <Field label="Last name" value={form.lastName} onChange={(value) => setForm((current) => ({ ...current, lastName: value }))} placeholder="Sharma" />
              <div className="sm:col-span-2"><Field label="Email address" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="admin@example.com" type="email" /></div>
            </div>

            <div>
              <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">Platform roles</p><p className="mt-1 text-xs text-slate-500">At least one selected role must allow System Console access.</p></div><span className="text-xs font-semibold text-slate-500">Selected: {form.roleIds.length}</span></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {roles.map((role) => { const selected = form.roleIds.includes(role.id); return <button key={role.id} type="button" onClick={() => toggleRole(role.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-violet-300 bg-violet-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{role.name}</p><p className="mt-1 text-xs text-slate-500">{role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}</p></div><span className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check size={14} /></span></div>
                  {selected && role.permissions.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{role.permissions.slice(0, 4).map((permission) => <PermissionChip key={permission.permissionId} permissionKey={permission.permissionKey} />)}{role.permissions.length > 4 && <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">+{role.permissions.length - 4} more</span>}</div>}
                </button>; })}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={resetCreate} disabled={creating} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={() => void createUser()} disabled={creating || !form.email.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.roleIds.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{creating && <RefreshCw className="h-4 w-4 animate-spin" />}{creating ? 'Creating…' : 'Create platform user'}</button></div>
          </div>}
        </div>
      </div>}
    </div>
  );
}

function RoleEditor({ user, roles, saving, onCancel, onSave }: { user: User; roles: Role[]; saving: boolean; onCancel: () => void; onSave: (roleIds: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(user.roleIds);
  return <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><div><p className="font-semibold text-slate-900">Platform access</p><p className="mt-1 text-sm text-slate-500">Choose the platform roles this administrator should have. Tenant roles are separate.</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{roles.map((role) => { const checked = selected.includes(role.id); return <button type="button" key={role.id} onClick={() => setSelected((current) => checked ? current.filter((id) => id !== role.id) : [...current, role.id])} className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${checked ? 'border-violet-300 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check size={13} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{role.name}</span><span className="mt-1 block text-xs text-slate-500">{role.permissions.length} platform permission{role.permissions.length === 1 ? '' : 's'}</span></span></button>; })}</div><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={() => onSave(selected)} disabled={saving || selected.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving && <RefreshCw className="h-4 w-4 animate-spin" />}Save access</button></div></div>;
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-800">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>;
}

function CredentialCard({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-sm text-slate-800">{value}</code>{copyable && <button type="button" onClick={() => void copy()} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100" aria-label={`Copy ${label}`}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>}</div></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">{icon}</div><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{children}</button>;
}

function EmptyState() {
  return <div className="p-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><UserPlus size={22} /></div><p className="mt-4 font-semibold text-slate-800">No platform users found</p><p className="mt-1 text-sm text-slate-500">Create a platform administrator or adjust your filters.</p></div>;
}
