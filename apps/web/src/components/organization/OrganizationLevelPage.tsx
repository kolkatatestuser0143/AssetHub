'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader } from '../ui';

type Department = { id: string; name: string };
type Location = { id: string; name: string; departments?: Department[] };
type Site = { id: string; name: string; type?: string; locations?: Location[] };
type Company = { id: string; name: string; code?: string; sites?: Site[] };

type Level = 'sites' | 'locations' | 'departments';

const labels: Record<Level, { title: string; description: string; emptyTitle: string; emptyText: string }> = {
  sites: { title: 'Sites', description: 'Manage plants, branch offices, head offices and other operating sites.', emptyTitle: 'No sites found', emptyText: 'Sites will appear here when they are created under a company.' },
  locations: { title: 'Locations', description: 'View locations organized under each operating site.', emptyTitle: 'No locations found', emptyText: 'Locations will appear here when they are created under a site.' },
  departments: { title: 'Departments', description: 'View departments organized under each location.', emptyTitle: 'No departments found', emptyText: 'Departments will appear here when they are created under a location.' },
};

export default function OrganizationLevelPage({ level }: { level: Level }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const meta = labels[level];

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/companies/hierarchy');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load organization data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: Array<{ id: string; name: string; company: string; site?: string; location?: string; type?: string }> = [];
    for (const company of companies) {
      for (const site of company.sites ?? []) {
        if (level === 'sites') result.push({ id: site.id, name: site.name, company: company.name, type: site.type });
        for (const location of site.locations ?? []) {
          if (level === 'locations') result.push({ id: location.id, name: location.name, company: company.name, site: site.name });
          for (const department of location.departments ?? []) {
            if (level === 'departments') result.push({ id: department.id, name: department.name, company: company.name, site: site.name, location: location.name });
          }
        }
      }
    }
    return q ? result.filter((row) => `${row.name} ${row.company} ${row.site ?? ''} ${row.location ?? ''} ${row.type ?? ''}`.toLowerCase().includes(q)) : result;
  }, [companies, level, query]);

  if (loading) return <LoadingState label={`Loading ${meta.title.toLowerCase()}…`} />;
  if (error) return <ErrorState title={`Unable to load ${meta.title.toLowerCase()}`} message={error} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={meta.title} description={meta.description} />
      <p className="-mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">People & Organization</p>
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${meta.title.toLowerCase()}`} className="field h-10 w-full pl-9" aria-label={`Search ${meta.title.toLowerCase()}`} />
          </div>
          <Badge>{rows.length} {meta.title.toLowerCase()}</Badge>
        </div>
        {rows.length === 0 ? (
          <EmptyState title={query ? `No ${meta.title.toLowerCase()} match your search` : meta.emptyTitle} text={query ? 'Try a different search term.' : meta.emptyText} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Company</th>
                  {level !== 'sites' ? <th className="px-5 py-3 font-semibold">Site</th> : <th className="px-5 py-3 font-semibold">Type</th>}
                  {level === 'departments' ? <th className="px-5 py-3 font-semibold">Location</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="ui-table-row">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--theme-primary-soft)] text-[var(--theme-link)]">{level === 'sites' ? <Building2 size={16}/> : <MapPin size={16}/>}</span><span className="font-semibold text-slate-900">{row.name}</span></div></td>
                    <td className="px-5 py-4 text-slate-600">{row.company}</td>
                    {level !== 'sites' ? <td className="px-5 py-4 text-slate-600">{row.site}</td> : <td className="px-5 py-4 text-slate-600">{row.type ? row.type.replaceAll('_', ' ') : 'Other'}</td>}
                    {level === 'departments' ? <td className="px-5 py-4 text-slate-600">{row.location}</td> : null}
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
