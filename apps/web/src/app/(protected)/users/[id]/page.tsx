'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Check, ChevronDown, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import { Badge, Button, LoadingState, StatusBadge } from '../../../../components/ui';

type AdminLevel = 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN';
type Employee = { id: string; employeeId?: string; email: string; firstName: string; lastName: string; companyId?: string; jobTitle?: string; isActive: boolean; adminLevel?: AdminLevel };
type Company = { id: string; name: string; code?: string; sites?: any[] };

const LEVEL_LABEL: Record<AdminLevel, string> = { EMPLOYEE: 'Employee', COMPANY_ADMIN: 'Company Admin', TENANT_ADMIN: 'Tenant Admin' };
const LEVEL_HELP: Record<AdminLevel, string> = { EMPLOYEE: 'Standard employee access.', COMPANY_ADMIN: 'Administrative access limited to assigned company scope.', TENANT_ADMIN: 'Tenant-wide administrator authority.' };

export default function EmployeeAccessPage() {
  const params = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [role, setRole] = useState<AdminLevel>('EMPLOYEE');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const [users, org] = await Promise.all([apiFetch('/users/employees'), apiFetch('/companies/hierarchy')]);
        if (!active) return;
        const list = Array.isArray(users) ? users : [];
        const found = list.find((user: Employee) => String(user.id) === String(params.id));
        const organization = Array.isArray(org) ? org.map((company: any) => ({ id: String(company.id), name: String(company.name), code: company.code ? String(company.code) : undefined, sites: company.sites })) : [];
        setEmployee(found ?? null); setCompanies(organization); setRole(found?.adminLevel ?? 'EMPLOYEE');
        setSelectedCompanies(found?.companyId ? [found.companyId] : []);
        if (!found) setError('Employee could not be found in your current access scope.');
      } catch (err: any) { if (active) setError(err?.message ?? 'Unable to load employee access.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  const company = useMemo(() => companies.find((item) => item.id === employee?.companyId), [companies, employee?.companyId]);

  async function saveAccess() {
    if (!employee) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await apiFetch(`/users/${employee.id}/admin-level`, { method: 'PATCH', body: JSON.stringify({ adminLevel: role }) });
      if (selectedCompanies.length && role !== 'TENANT_ADMIN' && selectedCompanies[0] !== employee.companyId) {
        await apiFetch(`/users/${employee.id}`, { method: 'PATCH', body: JSON.stringify({ companyId: selectedCompanies[0] }) });
      }
      setEmployee((current) => current ? { ...current, adminLevel: role, companyId: role === 'TENANT_ADMIN' ? current.companyId : selectedCompanies[0] ?? current.companyId } : current);
      setMessage('Access settings saved.');
    } catch (err: any) { setError(err?.message ?? 'Unable to save access settings.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-5xl py-10"><LoadingState label="Loading employee access…" /></div>;
  if (error && !employee) return <div className="mx-auto max-w-5xl space-y-4 py-10"><Link href="/employees" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15} />Back to employees</Link><section className="panel p-8"><p className="font-semibold text-slate-900">Unable to open employee</p><p className="mt-1 text-sm text-slate-500">{error}</p></section></div>;
  if (!employee) return null;

  return <div className="mx-auto max-w-5xl space-y-6 page-section-enter">
    <Link href="/employees" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15} />Back to employees</Link>
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><UserRound size={25} /></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-slate-950">{employee.firstName} {employee.lastName}</h1><Badge tone={role === 'TENANT_ADMIN' || role === 'COMPANY_ADMIN' ? 'brand' : 'neutral'}>{LEVEL_LABEL[role]}</Badge></div><p className="mt-1 text-sm text-slate-500">{employee.email} · <span className="font-mono">{employee.employeeId ?? 'Employee ID not set'}</span></p></div></div><StatusBadge status={employee.isActive ? 'ACTIVE' : 'INACTIVE'} />
    </header>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <section className="panel p-6">
        <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--theme-link)]" /><h2 className="font-semibold text-slate-950">Access</h2></div>
        <p className="mt-1 text-sm text-slate-500">Permissions determine what the employee can do. Scope determines where administrative access applies.</p>
        <div className="mt-6 space-y-5">
          <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label><div className="relative mt-2"><select value={role} onChange={(event) => setRole(event.target.value as AdminLevel)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--theme-link)]"><option value="EMPLOYEE">Employee</option><option value="COMPANY_ADMIN">Company Admin</option><option value="TENANT_ADMIN">Tenant Admin</option></select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div><p className="mt-2 text-xs text-slate-500">{LEVEL_HELP[role]}</p></div>
          <div><div className="flex items-center justify-between"><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company scope</label>{role === 'TENANT_ADMIN' && <Badge tone="brand">All tenant companies</Badge>}</div><div className={`mt-2 rounded-xl border border-slate-200 ${role === 'TENANT_ADMIN' ? 'bg-slate-50' : 'bg-white'}`}>
            {companies.length === 0 ? <p className="p-4 text-sm text-slate-500">No companies available in this tenant.</p> : companies.map((item) => { const checked = selectedCompanies.includes(item.id); return <button type="button" key={item.id} disabled={role === 'TENANT_ADMIN'} onClick={() => setSelectedCompanies((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 ${role === 'TENANT_ADMIN' ? 'cursor-default' : 'hover:bg-slate-50'}`}><span><span className="block text-sm font-medium text-slate-800">{item.name}</span><span className="text-xs text-slate-400">{item.code || item.id}</span></span><span className={`grid h-5 w-5 place-items-center rounded-md border ${role === 'TENANT_ADMIN' || checked ? 'border-[var(--theme-link)] bg-[var(--theme-link)] text-white' : 'border-slate-300 bg-white'}`}>{(role === 'TENANT_ADMIN' || checked) && <Check size={13} />}</span></button>; })}
          </div><p className="mt-2 text-xs text-slate-500">For company admins, select the companies they can administer. Tenant admins automatically have tenant-wide scope.</p></div>
          <div className="rounded-xl border border-[var(--theme-primary)]/15 bg-[var(--theme-primary-soft)] p-4"><p className="text-sm font-semibold text-slate-900">Permissions and scope stay separate</p><p className="mt-1 text-xs leading-5 text-slate-600">This screen assigns administrative authority and organization scope. Fine-grained permissions can be attached to roles without changing the employee's organization membership.</p></div>
          <div className="flex justify-end"><Button onClick={() => void saveAccess()} loading={saving}>Save access</Button></div>
        </div>
      </section>

      <section className="panel p-6"><h2 className="font-semibold text-slate-950">Employee profile</h2><dl className="mt-5 divide-y divide-slate-100 text-sm"><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Job title</dt><dd className="text-right font-medium text-slate-900">{employee.jobTitle || '—'}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Employee ID</dt><dd className="font-mono text-xs text-slate-700">{employee.employeeId || '—'}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Company</dt><dd className="flex items-center gap-2 text-right font-medium text-slate-900"><Building2 size={14} className="text-[var(--theme-link)]" />{company?.name || '—'}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={employee.isActive ? 'ACTIVE' : 'INACTIVE'} /></dd></div></dl></section>
    </div>
  </div>;
}
