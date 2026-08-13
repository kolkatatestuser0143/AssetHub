'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  companyId?: string;
  isActive: boolean;
  forcePasswordReset?: boolean;
  roleIds?: string[];
};

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiFetch('/users'));
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((u) => `${u.firstName} ${u.lastName} ${u.email} ${u.jobTitle ?? ''}`.toLowerCase().includes(needle));
  }, [items, q]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ email, firstName: name, lastName }),
      });
      setName('');
      setLastName('');
      setEmail('');
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to create user');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (user: User) => {
    setError(null);
    try {
      await apiFetch(`/users/${user.id}/${user.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' });
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to update user');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Access</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Users</h1>
          <p className="mt-2 text-sm text-slate-500">Manage tenant identities, roles, access lifecycle, and account status.</p>
        </div>
        <button form="create-user" type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
          <Plus size={16} /> Create user
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form id="create-user" onSubmit={create} className="grid gap-3 md:grid-cols-4">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs text-slate-500">
            <ShieldCheck size={15} /> New users are created with password reset required.
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-lg flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="h-9 w-full rounded-lg border border-slate-200 pl-9 text-sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><Users size={14} /> {rows.length} users</div>
        </div>

        {error && <div className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-14 text-center">
            <Users className="mx-auto text-slate-300" size={36} />
            <p className="mt-3 font-medium text-slate-900">No users found</p>
            <p className="mt-1 text-sm text-slate-500">Create a user or change the search filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Job title</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Roles</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><Link href={`/users/${user.id}`} className="font-medium text-slate-900 hover:text-blue-600">{user.firstName} {user.lastName}</Link><div className="mt-0.5 text-xs text-slate-500">{user.email}</div></td>
                    <td className="px-5 py-4 text-slate-600">{user.jobTitle || '—'}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{user.roleIds?.length ?? 0} assigned</td>
                    <td className="px-5 py-4 text-right"><button onClick={() => toggle(user)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}{user.isActive ? 'Deactivate' : 'Activate'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
