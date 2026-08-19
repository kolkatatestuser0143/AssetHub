'use client';

import { ChevronDown } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';

type Company = { id: string; name: string; code?: string };

export default function CompanyScopeControl({ className = '' }: { className?: string }) {
  const { adminLevel, tenantProfile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (adminLevel !== 'TENANT_ADMIN') {
      setCompanies(tenantProfile?.company ? [{ id: tenantProfile.company.id, name: tenantProfile.company.name, code: tenantProfile.company.code }] : []);
      return;
    }
    let active = true;
    void apiFetch('/companies/hierarchy').then((rows) => {
      if (!active) return;
      const data = Array.isArray(rows) ? rows : [];
      setCompanies(data.map((company: any) => ({ id: String(company.id), name: String(company.name), code: company.code ? String(company.code) : undefined })));
    }).catch(() => {
      if (active && tenantProfile?.company) setCompanies([{ id: tenantProfile.company.id, name: tenantProfile.company.name, code: tenantProfile.company.code }]);
    });
    return () => { active = false; };
  }, [adminLevel, tenantProfile?.company?.id]);

  if (adminLevel !== 'TENANT_ADMIN' || !pathname.startsWith('/employees') && !pathname.startsWith('/tenant-admins')) {
    return tenantProfile?.company ? <div className={`inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ${className}`}>{tenantProfile.company.name}</div> : null;
  }

  const value = params.get('companyId') ?? 'all';
  function change(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'all') next.delete('companyId'); else next.set('companyId', value);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return <div className={`relative ${className}`}>
    <label htmlFor="company-scope-control" className="sr-only">Company scope</label>
    <select id="company-scope-control" value={value} onChange={(event) => change(event.target.value)} className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--theme-link)]">
      <option value="all">All Companies</option>
      {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
    </select>
    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-slate-400" />
  </div>;
}
