'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, RefreshCw, Search, UserCheck, UserX } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Admin = {
  id: string;
  employeeId?: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  companyId?: string;
  isActive: boolean;
  adminLevel?: 'EMPLOYEE'|'COMPANY_ADMIN'|'TENANT_ADMIN';
};

type TenantProfile = { company?: { id: string; name: string } | null };

export default function TenantAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const rows = await apiFetch('/users/tenant-admins');
      setAdmins(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load Tenant Administrators.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function demote(admin: Admin) {
    setError(null); setMessage(null);
    try {
      await apiFetch(`/users/${admin.id}/admin-level`, { method: 'PATCH', body: JSON.stringify({ adminLevel: 'EMPLOYEE' }) });
      setMessage(`${admin.firstName} ${admin.lastName} is now an Employee.`);
      await load();
    } catch (e: any) { setError(e?.message ?? 'Unable to remove Tenant Admin access.'); }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) => `${a.firstName} ${a.lastName} ${a.email} ${a.employeeId ?? ''} ${a.jobTitle ?? ''}`.toLowerCase().includes(q));
  }, [admins, query]);

  return <div className="mx-auto max-w-[1500px] space-y-6 page-section-enter">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]"><ShieldCheck size={14}/>Administration</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Tenant Administrators</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage people who have tenant-wide administrative authority. Tenant Admin is separate from ordinary employee access.</p>
      </div>
      <button onClick={() => void load()} disabled={loading} className="btn-secondary ui-interactive"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Refresh</button>
    </header>

    {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><b>Unable to complete the request</b><div className="mt-1">{error}</div></div> : null}
    {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

    <section className="panel overflow-hidden">
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm"><Search size={16} className="text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Tenant Administrators…" className="w-full bg-transparent py-2 text-sm outline-none"/></label>
      </div>
      {loading ? <div className="p-8 text-sm text-slate-500">Loading Tenant Administrators…</div> : filtered.length === 0 ? <div className="p-8 text-sm text-slate-500">No Tenant Administrators found.</div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Administrator</th><th className="px-5 py-3">Company</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Access</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((admin) => <tr key={admin.id} className="hover:bg-[var(--theme-primary-soft)]/35"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{admin.firstName} {admin.lastName}</div><div className="mt-0.5 text-xs text-slate-500">{admin.email}</div><div className="mt-0.5 font-mono text-[11px] text-slate-400">{admin.employeeId || 'Employee ID not set'}</div></td><td className="px-5 py-4 text-slate-600">{admin.companyId || 'Tenant-wide'}</td><td className="px-5 py-4"><span className={admin.isActive ? 'badge badge-success' : 'badge badge-neutral'}>{admin.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4"><span className="badge badge-brand">Tenant-wide administration</span></td><td className="px-5 py-4 text-right"><button onClick={() => void demote(admin)} className="btn-secondary btn-sm ui-interactive"><UserX size={14}/>Demote</button></td></tr>)}</tbody></table></div>}
    </section>

    <section className="panel p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><UserCheck size={17}/></div><div><h2 className="font-semibold text-slate-900">Promote an Employee</h2><p className="mt-1 text-sm leading-6 text-slate-500">Promotion is performed from the Employees workspace. A promoted Employee receives tenant-wide administration and is automatically assigned the Tenant Admin role.</p></div></div></section>
  </div>;
}
