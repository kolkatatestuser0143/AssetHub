'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
  isActive: boolean;
  forcePasswordReset?: boolean;
  roleIds?: string[];
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', jobTitle: '', phone: '' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load tenant users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          jobTitle: form.jobTitle || undefined,
          phone: form.phone || undefined,
        }),
      });
      setForm({ email: '', firstName: '', lastName: '', jobTitle: '', phone: '' });
      setShowCreate(false);
      setMessage('User created. The account is marked for password setup on first access.');
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/users/${user.id}/${user.isActive ? 'deactivate' : 'activate'}`, {
        method: 'PATCH',
      });
      setMessage(user.isActive ? 'User deactivated.' : 'User activated.');
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to update user status.');
    }
  }

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !text || `${user.firstName} ${user.lastName} ${user.email} ${user.jobTitle ?? ''}`.toLowerCase().includes(text);
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? user.isActive : !user.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [users, query, statusFilter]);

  const activeCount = users.filter((user) => user.isActive).length;
  const resetCount = users.filter((user) => user.forcePasswordReset).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Access</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Users</h1>
          <p className="mt-2 text-sm text-slate-500">Manage tenant identities, roles, sessions, and access lifecycle.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            <Plus size={16} /> Add user
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Total users</p><p className="mt-2 text-2xl font-bold text-slate-950">{users.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Active</p><p className="mt-2 text-2xl font-bold text-emerald-700">{activeCount}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Password setup required</p><p className="mt-2 text-2xl font-bold text-amber-700">{resetCount}</p></div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, job title" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="ALL">All users</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <span className="text-xs text-slate-500">{filtered.length} of {users.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">{[1, 2, 3, 4, 5].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <Users size={38} className="mx-auto text-slate-300" />
            <p className="mt-4 font-semibold text-slate-800">No tenant users found</p>
            <p className="mt-1 text-sm text-slate-500">Create a user to begin managing tenant access.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role assignments</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Access setup</th><th className="px-5 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><Link href={`/users/${user.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{user.firstName} {user.lastName}</Link><div className="mt-1 text-xs text-slate-500">{user.email}</div>{user.jobTitle && <div className="mt-1 text-xs text-slate-400">{user.jobTitle}</div>}</td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><ShieldCheck size={13} />{user.roleIds?.length ?? 0} role{(user.roleIds?.length ?? 0) === 1 ? '' : 's'}</span></td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? <UserCheck size={13} /> : <UserX size={13} />}{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4">{user.forcePasswordReset ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Password setup required</span> : <span className="text-xs text-slate-500">Configured</span>}</td>
                    <td className="px-5 py-4 text-right"><div className="inline-flex items-center gap-2"><button type="button" onClick={() => void toggleActive(user)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{user.isActive ? 'Deactivate' : 'Activate'}</button><Link href={`/users/${user.id}`} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Open</Link></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Tenant access</p><h2 className="mt-1 text-xl font-bold text-slate-950">Add user</h2><p className="mt-1 text-sm text-slate-500">Create a tenant identity. Roles can be assigned from the user detail workspace.</p></div><button type="button" onClick={() => setShowCreate(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Close</button></div>
            <form onSubmit={createUser} className="mt-6 grid gap-4 md:grid-cols-2">
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
              <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Job title" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="h-11 rounded-xl border border-slate-200 px-3 text-sm md:col-span-2" />
              <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Creating…' : 'Create user'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
