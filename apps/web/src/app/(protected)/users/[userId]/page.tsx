'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { apiFetch } from '../../../../lib/api-client';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
  companyId?: string;
  departmentId?: string;
  locationId?: string;
  isActive: boolean;
  forcePasswordReset?: boolean;
  roleIds?: string[];
};

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await apiFetch(`/users/${params.userId}`));
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.userId) void load();
  }, [params.userId]);

  const toggle = async () => {
    if (!user) return;
    try {
      await apiFetch(`/users/${user.id}/${user.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' });
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to update user');
    }
  };

  if (loading) return <div className="mx-auto max-w-5xl space-y-4"><div className="h-6 w-28 animate-pulse rounded bg-slate-100" /><div className="h-40 animate-pulse rounded-2xl bg-slate-100" /><div className="h-52 animate-pulse rounded-2xl bg-slate-100" /></div>;
  if (error || !user) return <div className="mx-auto max-w-5xl"><Link href="/users" className="inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft size={16}/> Back to users</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error ?? 'User not found'}</div></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/users" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"><ArrowLeft size={16}/> Back to users</Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Users size={24}/></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">User profile</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{user.firstName} {user.lastName}</h1><p className="mt-1 text-sm text-slate-500">{user.email}</p></div>
        </div>
        <button onClick={toggle} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">{user.isActive ? <UserX size={16}/> : <UserCheck size={16}/>} {user.isActive ? 'Deactivate account' : 'Activate account'}</button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Profile</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Email</dt><dd className="mt-1 font-medium text-slate-900">{user.email}</dd></div><div><dt className="text-slate-500">Job title</dt><dd className="mt-1 text-slate-900">{user.jobTitle || '—'}</dd></div><div><dt className="text-slate-500">Phone</dt><dd className="mt-1 text-slate-900">{user.phone || '—'}</dd></div></dl></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Access</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Status</dt><dd className="mt-1"><span className={`rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></dd></div><div><dt className="text-slate-500">Password reset required</dt><dd className="mt-1 text-slate-900">{user.forcePasswordReset ? 'Yes' : 'No'}</dd></div><div><dt className="text-slate-500">Assigned roles</dt><dd className="mt-1 flex items-center gap-2 text-slate-900"><ShieldCheck size={15} className="text-blue-600"/>{user.roleIds?.length ?? 0}</dd></div></dl></section>
      </div>
    </div>
  );
}
