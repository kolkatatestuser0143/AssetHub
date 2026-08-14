'use client';

import { useEffect, useState } from 'react';
import { UserCircle, Mail, Phone, Briefcase, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
  isActive: boolean;
  roleIds?: string[];
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await apiFetch('/users/me');
        setUser(result);
      } catch (err: any) {
        try {
          const result = await apiFetch('/users');
          if (Array.isArray(result) && result.length === 1) setUser(result[0]);
          else throw err;
        } catch (fallbackErr: any) {
          setError(fallbackErr?.message ?? err?.message ?? 'Unable to load profile.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="mx-auto max-w-4xl"><div className="h-8 w-48 animate-pulse rounded bg-slate-200" /><div className="mt-6 h-80 animate-pulse rounded-2xl bg-slate-100" /></div>;
  if (error || !user) return <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error ?? 'Profile unavailable.'}</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Account</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Profile</h1><p className="mt-2 text-sm text-slate-500">View your tenant account information and access status.</p></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UserCircle size={30}/></div>
          <div><h2 className="text-xl font-bold text-slate-950">{user.firstName} {user.lastName}</h2><p className="text-sm text-slate-500">{user.email}</p></div>
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="grid gap-5 pt-6 sm:grid-cols-2">
          <Info icon={<Mail size={17}/>} label="Email" value={user.email} />
          <Info icon={<Briefcase size={17}/>} label="Job title" value={user.jobTitle || 'Not specified'} />
          <Info icon={<Phone size={17}/>} label="Phone" value={user.phone || 'Not specified'} />
          <Info icon={<ShieldCheck size={17}/>} label="Assigned roles" value={String(user.roleIds?.length ?? 0)} />
        </div>
      </section>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{icon}{label}</div><p className="mt-2 text-sm font-medium text-slate-900">{value}</p></div>;
}
