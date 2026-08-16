'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Edit3, Loader2, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type SiteType = 'plant' | 'branch_office' | 'head_office' | 'other';
type Node = { id: string; name: string };
type Department = Node;
type Location = Node & { departments?: Department[] };
type Site = Node & { type?: SiteType; locations?: Location[] };
type Company = Node & { code?: string; sites?: Site[] };
type Modal = { kind: 'company' | 'site' | 'location' | 'department'; mode: 'create' | 'edit'; id?: string; parentId?: string; name: string; code?: string; type?: SiteType } | null;

const SITE_LABEL: Record<SiteType, string> = { plant: 'Plant', branch_office: 'Branch Office', head_office: 'Head Office', other: 'Other' };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const data = await apiFetch('/companies/hierarchy'); setCompanies(Array.isArray(data) ? data : []); }
    catch (err: any) { setError(err?.message ?? 'Unable to load organization.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function openCreate(kind: Modal['kind'], parentId?: string) { setModal({ mode: 'create', kind, parentId, name: '', code: kind === 'company' ? '' : undefined, type: kind === 'site' ? 'plant' : undefined }); setError(null); }
  function openEdit(kind: Modal['kind'], node: Node & { code?: string; type?: SiteType }) { setModal({ mode: 'edit', kind, id: node.id, name: node.name, code: node.code, type: kind === 'site' ? (node.type ?? 'plant') : undefined }); setError(null); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!modal) return; setSaving(true); setError(null);
    try {
      const name = modal.name.trim(); if (!name) throw new Error('Name is required');
      let url = ''; let body: Record<string, unknown> = { name };
      if (modal.kind === 'company') { body = { name, code: modal.code?.trim().toUpperCase() }; url = modal.mode === 'create' ? '/companies' : `/companies/${modal.id}`; }
      else if (modal.kind === 'site') { body = { name, type: modal.type }; url = modal.mode === 'create' ? `/companies/${modal.parentId}/sites` : `/companies/sites/${modal.id}`; }
      else if (modal.kind === 'location') { url = modal.mode === 'create' ? `/companies/sites/${modal.parentId}/locations` : `/companies/locations/${modal.id}`; }
      else { url = modal.mode === 'create' ? `/companies/locations/${modal.parentId}/departments` : `/companies/departments/${modal.id}`; }
      await apiFetch(url, { method: modal.mode === 'create' ? 'POST' : 'PATCH', body: JSON.stringify(body) });
      setModal(null); await load();
    } catch (err: any) { setError(err?.message ?? `Unable to ${modal.mode} ${modal.kind}.`); }
    finally { setSaving(false); }
  }

  async function remove(kind: Modal['kind'], node: Node) {
    if (!window.confirm(`Delete ${kind === 'site' ? 'site' : kind} “${node.name}”? Dependent records will block deletion.`)) return;
    setError(null);
    try { const url = kind === 'company' ? `/companies/${node.id}` : kind === 'site' ? `/companies/sites/${node.id}` : kind === 'location' ? `/companies/locations/${node.id}` : `/companies/departments/${node.id}`; await apiFetch(url, { method: 'DELETE' }); await load(); }
    catch (err: any) { setError(err?.message ?? 'Delete failed.'); }
  }

  const visibleCompanies = useMemo(() => companies.filter((c) => `${c.name} ${c.code ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [companies, query]);
  const toggle = (key: string) => setExpanded((s) => ({ ...s, [key]: !s[key] }));
  const modalTitle = modal ? `${modal.mode === 'create' ? 'Add' : 'Edit'} ${modal.kind === 'site' ? 'Site' : modal.kind.charAt(0).toUpperCase() + modal.kind.slice(1)}` : '';

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Organization</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Companies & structure</h1><p className="mt-2 text-sm text-slate-500">Company → Plant / Branch Office / Head Office / Other → Location → Department.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button><button type="button" onClick={() => openCreate('company')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16}/>Add Company</button></div></div>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4"><div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></div><span className="text-xs text-slate-500">{visibleCompanies.length} companies</span></div>
      {loading ? <div className="space-y-3 p-5">{[1,2,3].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100"/>)}</div> : visibleCompanies.length === 0 ? <div className="p-14 text-center"><Building2 size={38} className="mx-auto text-slate-300"/><p className="mt-4 font-semibold text-slate-800">No companies found</p></div> : <div className="divide-y divide-slate-100">{visibleCompanies.map((company) => { const companyKey = `company:${company.id}`; return <div key={company.id}>
        <div className="group flex items-center gap-2 px-5 py-4 hover:bg-slate-50"><button type="button" onClick={() => toggle(companyKey)} className="flex min-w-0 flex-1 items-center gap-3 text-left">{expanded[companyKey] ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}<div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Building2 size={17}/></div><div className="min-w-0"><div className="font-semibold text-slate-900">{company.name}</div><div className="text-xs text-slate-500">{company.code ?? 'No code'}</div></div></button><div className="flex gap-1"><button type="button" onClick={() => openEdit('company', company)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Edit company"><Edit3 size={14}/></button><button type="button" onClick={() => void remove('company', company)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Delete company"><Trash2 size={14}/></button><button type="button" onClick={() => openCreate('site', company.id)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Add site"><Plus size={15}/></button></div></div>
        {expanded[companyKey] && <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2">{(company.sites ?? []).length === 0 ? <p className="px-9 py-3 text-sm text-slate-500">No sites. Add a Plant, Branch Office, Head Office or Other.</p> : (company.sites ?? []).map((site) => { const siteKey = `site:${site.id}`; return <div key={site.id}><div className="flex items-center gap-2 rounded-lg px-4 py-2.5 hover:bg-white"><button type="button" onClick={() => toggle(siteKey)} className="flex min-w-0 flex-1 items-center gap-3 text-left">{expanded[siteKey] ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}<div className="flex-1"><div className="text-sm font-semibold text-slate-800">{site.name}</div><div className="text-xs text-slate-400">{SITE_LABEL[site.type ?? 'plant']}</div></div></button><div className="flex gap-1"><button type="button" onClick={() => openEdit('site', site)} className="rounded-lg p-2 text-slate-500"><Edit3 size={13}/></button><button type="button" onClick={() => void remove('site', site)} className="rounded-lg p-2 text-red-500"><Trash2 size={13}/></button><button type="button" onClick={() => openCreate('location', site.id)} className="rounded-lg p-2 text-blue-600"><Plus size={13}/></button></div></div>
          {expanded[siteKey] && <div className="ml-6 border-l border-slate-200 pl-3">{(site.locations ?? []).length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No locations.</p> : (site.locations ?? []).map((location) => { const locationKey = `location:${location.id}`; return <div key={location.id}><div className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white"><button type="button" onClick={() => toggle(locationKey)} className="flex min-w-0 flex-1 items-center gap-3 text-left">{expanded[locationKey] ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}<span className="flex-1 text-sm text-slate-700">{location.name}</span></button><div className="flex gap-1"><button type="button" onClick={() => openEdit('location', location)} className="rounded-lg p-1.5 text-slate-500"><Edit3 size={13}/></button><button type="button" onClick={() => void remove('location', location)} className="rounded-lg p-1.5 text-red-500"><Trash2 size={13}/></button><button type="button" onClick={() => openCreate('department', location.id)} className="rounded-lg p-1.5 text-blue-600"><Plus size={13}/></button></div></div>{expanded[locationKey] && <div className="ml-5 border-l border-slate-200 pl-3">{(location.departments ?? []).length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No departments.</p> : (location.departments ?? []).map((department) => <div key={department.id} className="flex items-center gap-2 px-3 py-2"><span className="flex-1 text-sm text-slate-700">{department.name}</span><button type="button" onClick={() => openEdit('department', department)} className="rounded-lg p-1.5 text-slate-500"><Edit3 size={13}/></button><button type="button" onClick={() => void remove('department', department)} className="rounded-lg p-1.5 text-red-500"><Trash2 size={13}/></button></div>)}</div>}</div>; })}</div>}</div>; })}</div>}
      </div>; })}</div>}
    </section>
    {modal && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-950">{modalTitle}</h2><p className="mt-1 text-xs text-slate-500">{modal.kind === 'company' ? 'Company code is unique within this tenant.' : 'Name is required.'}</p></div><button type="button" onClick={() => !saving && setModal(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><X size={16}/></button></div><form onSubmit={submit} className="space-y-4 p-5">{modal.kind === 'site' && <label className="block text-sm"><span className="font-medium text-slate-700">Site type</span><select value={modal.type} onChange={(e) => setModal((s) => s ? { ...s, type: e.target.value as SiteType } : s)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="plant">Plant</option><option value="branch_office">Branch Office</option><option value="head_office">Head Office</option><option value="other">Other</option></select></label>}<label className="block text-sm"><span className="font-medium text-slate-700">Name</span><input required value={modal.name} onChange={(e) => setModal((s) => s ? { ...s, name: e.target.value } : s)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" placeholder={`${modal.kind === 'site' ? 'Site' : modal.kind.charAt(0).toUpperCase() + modal.kind.slice(1)} name`}/></label>{modal.kind === 'company' && <label className="block text-sm"><span className="font-medium text-slate-700">Code</span><input required minLength={2} value={modal.code ?? ''} onChange={(e) => setModal((s) => s ? { ...s, code: e.target.value.toUpperCase() } : s)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 uppercase" placeholder="e.g. Y24"/></label>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin"/>}{modal.mode === 'create' ? 'Create' : 'Save changes'}</button></div></form></div></div>}
  </div>;
}
