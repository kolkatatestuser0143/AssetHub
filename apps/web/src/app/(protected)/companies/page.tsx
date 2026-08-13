'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { Building2, ChevronDown, ChevronRight, Loader2, Plus, RefreshCw, Search } from 'lucide-react';

type Node = { id: string; name: string; code?: string };
type Company = Node;
type BusinessUnit = Node;
type Plant = Node;
type Location = Node;
type Department = Node;

type ExpandedState = Record<string, boolean>;

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [businessUnits, setBusinessUnits] = useState<Record<string, BusinessUnit[]>>({});
  const [plants, setPlants] = useState<Record<string, Plant[]>>({});
  const [locations, setLocations] = useState<Record<string, Location[]>>({});
  const [departments, setDepartments] = useState<Record<string, Department[]>>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [loading, setLoading] = useState(true);
  const [loadingNode, setLoadingNode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [newCompany, setNewCompany] = useState({ name: '', code: '' });
  const [busy, setBusy] = useState(false);

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/companies');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load companies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCompanies(); }, []);

  async function toggleCompany(company: Company) {
    const key = `company:${company.id}`;
    if (expanded[key]) {
      setExpanded((s) => ({ ...s, [key]: false }));
      return;
    }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (businessUnits[company.id]) return;
    setLoadingNode(key);
    try {
      const data = await apiFetch(`/companies/${company.id}/business-units`);
      setBusinessUnits((s) => ({ ...s, [company.id]: Array.isArray(data) ? data : [] }));
    } catch (err: any) {
      setExpanded((s) => ({ ...s, [key]: false }));
      setError(err?.message ?? 'Unable to load business units.');
    } finally { setLoadingNode(null); }
  }

  async function toggleBusinessUnit(companyId: string, bu: BusinessUnit) {
    const key = `bu:${bu.id}`;
    if (expanded[key]) { setExpanded((s) => ({ ...s, [key]: false })); return; }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (plants[bu.id]) return;
    setLoadingNode(key);
    try {
      const data = await apiFetch(`/companies/business-units/${bu.id}/plants`);
      setPlants((s) => ({ ...s, [bu.id]: Array.isArray(data) ? data : [] }));
    } catch (err: any) {
      setExpanded((s) => ({ ...s, [key]: false }));
      setError(err?.message ?? 'Unable to load plants.');
    } finally { setLoadingNode(null); }
  }

  async function togglePlant(plant: Plant) {
    const key = `plant:${plant.id}`;
    if (expanded[key]) { setExpanded((s) => ({ ...s, [key]: false })); return; }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (locations[plant.id]) return;
    setLoadingNode(key);
    try {
      const data = await apiFetch(`/companies/plants/${plant.id}/locations`);
      setLocations((s) => ({ ...s, [plant.id]: Array.isArray(data) ? data : [] }));
    } catch (err: any) {
      setExpanded((s) => ({ ...s, [key]: false }));
      setError(err?.message ?? 'Unable to load locations.');
    } finally { setLoadingNode(null); }
  }

  async function toggleLocation(location: Location) {
    const key = `location:${location.id}`;
    if (expanded[key]) { setExpanded((s) => ({ ...s, [key]: false })); return; }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (departments[location.id]) return;
    setLoadingNode(key);
    try {
      const data = await apiFetch(`/companies/locations/${location.id}/departments`);
      setDepartments((s) => ({ ...s, [location.id]: Array.isArray(data) ? data : [] }));
    } catch (err: any) {
      setExpanded((s) => ({ ...s, [key]: false }));
      setError(err?.message ?? 'Unable to load departments.');
    } finally { setLoadingNode(null); }
  }

  async function createCompany(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      await apiFetch('/companies', { method: 'POST', body: JSON.stringify({ name: newCompany.name.trim(), code: newCompany.code.trim().toUpperCase() }) });
      setNewCompany({ name: '', code: '' });
      await loadCompanies();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to create company.');
    } finally { setBusy(false); }
  }

  const visibleCompanies = useMemo(() => companies.filter((company) => `${company.name} ${company.code ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [companies, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Organization</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Companies & structure</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Explore the tenant hierarchy from company through business unit, plant, location and department.</p>
        </div>
        <button onClick={() => void loadCompanies()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Plus size={17} className="text-blue-600" /><h2 className="font-semibold text-slate-900">Add company</h2></div>
        <form onSubmit={createCompany} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input required value={newCompany.name} onChange={(e) => setNewCompany((s) => ({ ...s, name: e.target.value }))} placeholder="Company name" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <input required minLength={2} value={newCompany.code} onChange={(e) => setNewCompany((s) => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="Code" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-mono uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Create</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
          <span className="text-xs text-slate-500">{visibleCompanies.length} of {companies.length} companies</span>
        </div>

        {loading ? <div className="space-y-3 p-5">{[1,2,3,4].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div> : visibleCompanies.length === 0 ? (
          <div className="p-14 text-center"><Building2 size={38} className="mx-auto text-slate-300" /><p className="mt-4 font-semibold text-slate-800">No companies found</p><p className="mt-1 text-sm text-slate-500">Create a company above or adjust your search.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleCompanies.map((company) => {
              const companyKey = `company:${company.id}`;
              const isCompanyOpen = !!expanded[companyKey];
              return <div key={company.id}>
                <button onClick={() => void toggleCompany(company)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50">
                  {isCompanyOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Building2 size={17} /></div>
                  <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{company.name}</div><div className="text-xs text-slate-500">{company.code ?? 'No code'} · {company.id}</div></div>
                  {loadingNode === companyKey && <Loader2 size={16} className="animate-spin text-slate-400" />}
                </button>
                {isCompanyOpen && <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2">
                  {(businessUnits[company.id] ?? []).length === 0 ? <p className="px-9 py-3 text-sm text-slate-500">No business units.</p> : (businessUnits[company.id] ?? []).map((bu) => {
                    const key = `bu:${bu.id}`;
                    return <div key={bu.id}><button onClick={() => void toggleBusinessUnit(company.id, bu)} className="flex w-full items-center gap-3 rounded-lg px-9 py-3 text-left hover:bg-white"><span>{expanded[key] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span><div className="flex-1"><div className="text-sm font-semibold text-slate-800">{bu.name}</div><div className="text-xs text-slate-400">Business unit</div></div>{loadingNode === key && <Loader2 size={15} className="animate-spin text-slate-400" />}</button>{expanded[key] && <div className="ml-12 border-l border-slate-200 pl-3">{(plants[bu.id] ?? []).length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No plants.</p> : (plants[bu.id] ?? []).map((plant) => { const pkey = `plant:${plant.id}`; return <div key={plant.id}><button onClick={() => void togglePlant(plant)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white"><span>{expanded[pkey] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span><div className="flex-1 text-sm font-medium text-slate-700">{plant.name}</div>{loadingNode === pkey && <Loader2 size={14} className="animate-spin text-slate-400" />}</button>{expanded[pkey] && <div className="ml-5 border-l border-slate-200 pl-3">{(locations[plant.id] ?? []).length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No locations.</p> : (locations[plant.id] ?? []).map((location) => { const lkey = `location:${location.id}`; return <div key={location.id}><button onClick={() => void toggleLocation(location)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white"><span>{expanded[lkey] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span><div className="flex-1 text-sm text-slate-700">{location.name}</div>{loadingNode === lkey && <Loader2 size={13} className="animate-spin text-slate-400" />}</button>{expanded[lkey] && <div className="ml-5 border-l border-slate-200 pl-3">{(departments[location.id] ?? []).length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No departments.</p> : (departments[location.id] ?? []).map((department) => <div key={department.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />{department.name}</div>)}</div>}</div>; })}</div>}</div>; })}</div>}</div>; })}
                </div>}
              </div>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
