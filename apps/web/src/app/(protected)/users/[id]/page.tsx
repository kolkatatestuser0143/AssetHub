'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import { Badge, LoadingState, StatusBadge } from '../../../../components/ui';

type AdminLevel = 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN';
type Employee = { id: string; employeeId?: string; email: string; firstName: string; lastName: string; companyId?: string; jobTitle?: string; isActive: boolean; adminLevel?: AdminLevel };
type Company = { id: string; name: string; code?: string };

const LEVEL_LABEL: Record<AdminLevel, string> = { EMPLOYEE: 'Employee', COMPANY_ADMIN: 'Company Admin', TENANT_ADMIN: 'Tenant Admin' };

export default function EmployeeAccessPage() {
  const params = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [users, org] = await Promise.all([apiFetch('/users/employees'), apiFetch('/companies/hierarchy')]);
        if (!active) return;
        const list = Array.isArray(users) ? users : [];
        const found = list.find((user: Employee) => String(user.id) === String(params.id));
        setEmployee(found ?? null);
        setCompanies(Array.isArray(org) ? org.map((company: any) => ({ id: String(company.id), name: String(company.name), code: company.code ? String(company.code) : undefined })) : []);
        if (!found) setError('Employee could not be found in your current access scope.');
      } catch (err: any) {
        if (active) setError(err?.message ?? 'Unable to load employee access.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  const company = useMemo(() => companies.find((item) => item.id === employee?.companyId), [companies, employee?.companyId]);

  if (loading) return <div className="mx-auto max-w-5xl py-10"><LoadingState label="Loading employee access…" /></div>;
  if (error || !employee) return <div className="mx-auto max-w-5xl space-y-4 py-10"><Link href="/employees" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15} />Back to employees</Link><section className="panel p-8"><p className="font-semibold text-slate-900">Unable to open employee</p><p className="mt-1 text-sm text-slate-500">{error ?? 'Employee not found.'}</p></section></div>;

  return <div className="mx-auto max-w-5xl space-y-6 page-section-enter">
    <Link href="/employees" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15} />Back to employees</Link>
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><UserRound size={25} /></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-slate-950">{employee.firstName} {employee.lastName}</h1><Badge tone={employee.adminLevel === 'TENANT_ADMIN' || employee.adminLevel === 'COMPANY_ADMIN' ? 'brand' : 'neutral'}>{LEVEL_LABEL[employee.adminLevel ?? 'EMPLOYEE']}</Badge></div><p className="mt-1 text-sm text-slate-500">{employee.email} · <span className="font-mono">{employee.employeeId ?? 'Employee ID not set'}</span></p></div></div>
      <StatusBadge status={employee.isActive ? 'ACTIVE' : 'INACTIVE'} />
    </header>

    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <section className="panel p-6">
        <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--theme-link)]" /><h2 className="font-semibold text-slate-950">Access</h2></div>
        <p className="mt-1 text-sm text-slate-500">Permissions determine what the employee can do. Scope determines where administrative access applies.</p>
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p><p className="mt-1 font-semibold text-slate-900">{LEVEL_LABEL[employee.adminLevel ?? 'EMPLOYEE']}</p><p className="mt-1 text-xs text-slate-500">{employee.adminLevel === 'TENANT_ADMIN' ? 'Tenant-wide administrator authority.' : employee.adminLevel === 'COMPANY_ADMIN' ? 'Company administrator authority.' : 'Standard employee access.'}</p></div>
          <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organization scope</p><div className="mt-3 flex items-start gap-3"><Building2 size={17} className="mt-0.5 text-[var(--theme-link)]" /><div><p className="font-medium text-slate-900">{company?.name ?? 'No company assigned'}</p><p className="mt-0.5 text-xs text-slate-500">{company?.code ? `Code: ${company.code}` : 'Company scope is not assigned.'}</p></div></div></div>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-semibold text-slate-950">Employee profile</h2>
        <dl className="mt-5 divide-y divide-slate-100 text-sm">
          <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Job title</dt><dd className="text-right font-medium text-slate-900">{employee.jobTitle || '—'}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Employee ID</dt><dd className="font-mono text-xs text-slate-700">{employee.employeeId || '—'}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Company</dt><dd className="text-right font-medium text-slate-900">{company?.name || '—'}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={employee.isActive ? 'ACTIVE' : 'INACTIVE'} /></dd></div>
        </dl>
      </section>
    </div>

    <section className="rounded-2xl border border-[var(--theme-primary)]/15 bg-[var(--theme-primary-soft)] p-5"><p className="text-sm font-semibold text-slate-900">Scope model</p><p className="mt-1 text-sm leading-6 text-slate-600">AssetHub keeps organization membership separate from administrator authority. Company and location scope can be refined by the RBAC controls as those scopes are assigned.</p></section>
  </div>;
}
