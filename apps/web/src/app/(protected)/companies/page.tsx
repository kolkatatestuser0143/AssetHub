'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, Edit3, Layers3, MapPin, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';
import { Badge, Button, EmptyState, ErrorState, LoadingState } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { FormField, FormSelect } from '../../../components/form-field';

type SiteType = 'plant' | 'branch_office' | 'head_office' | 'other';
type Node = { id: string; name: string };
type Department = Node;
type Location = Node & { departments?: Department[] };
type Site = Node & { type?: SiteType; locations?: Location[] };
type Company = Node & { code?: string; sites?: Site[] };
type Modal = { kind: 'company' | 'site' | 'location' | 'department'; mode: 'create' | 'edit'; id?: string; parentId?: string; name: string; code?: string; type?: SiteType } | null;
type DeleteTarget = { kind: Exclude<Modal, null>['kind']; node: Node } | null;

const SITE_LABEL: Record<SiteType, string> = { plant: 'Plant', branch_office: 'Branch Office', head_office: 'Head Office', other: 'Other' };
const KIND_LABEL: Record<Exclude<Modal, null>['kind'], string> = { company: 'company', site: 'site', location: 'location', department: 'department' };
const SITE_TYPES = Object.entries(SITE_LABEL).map(([value, label]) => ({ value, label }));

function structureCounts(company: Company) {
  const sites = company.sites ?? [];
  const locations = sites.flatMap((site) => site.locations ?? []);
  const departments = locations.flatMap((location) => location.departments ?? []);
  return { sites: sites.length, locations: locations.length, departments: departments.length };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/companies/hierarchy');
      const next = Array.isArray(data) ? data : [];
      setCompanies(next);
      setSelectedId((current) => current && next.some((company: Company) => company.id === current) ? current : next[0]?.id ?? null);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load companies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visibleCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((company) => !q || `${company.name} ${company.code ?? ''}`.toLowerCase().includes(q));
  }, [companies, query]);

  const selected = companies.find((company) => company.id === selectedId) ?? visibleCompanies[0] ?? null;
  const totals = useMemo(() => companies.reduce((acc, company) => {
    const count = structureCounts(company);
    acc.sites += count.sites; acc.locations += count.locations; acc.departments += count.departments;
    return acc;
  }, { sites: 0, locations: 0, departments: 0 }), [companies]);

  function openCreate(kind: Modal['kind'], parentId?: string) {
    setNotice(null); setError(null);
    setModal({ mode: 'create', kind, parentId, name: '', code: kind === 'company' ? '' : undefined, type: kind === 'site' ? 'plant' : undefined });
  }

  function openEdit(kind: Modal['kind'], node: Node & { code?: string; type?: SiteType }) {
    setNotice(null); setError(null);
    setModal({ mode: 'edit', kind, id: node.id, name: node.name, code: node.code, type: kind === 'site' ? (node.type ?? 'plant') : undefined });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const name = modal.name.trim();
      if (!name) throw new Error('Enter a name before saving.');
      let url = '';
      let body: Record<string, unknown> = { name };
      if (modal.kind === 'company') {
        body = { name, code: modal.code?.trim().toUpperCase() };
        url = modal.mode === 'create' ? '/companies' : `/companies/${modal.id}`;
      } else if (modal.kind === 'site') {
        if (modal.mode === 'create' && !modal.parentId) throw new Error('Select a company for this site.');
        body = { name, type: modal.type ?? 'plant' };
        url = modal.mode === 'create' ? `/companies/${modal.parentId}/sites` : `/companies/sites/${modal.id}`;
      } else if (modal.kind === 'location') {
        if (modal.mode === 'create' && !modal.parentId) throw new Error('Select a site for this location.');
        url = modal.mode === 'create' ? `/companies/sites/${modal.parentId}/locations` : `/companies/locations/${modal.id}`;
      } else {
        if (modal.mode === 'create' && !modal.parentId) throw new Error('Select a location for this department.');
        url = modal.mode === 'create' ? `/companies/locations/${modal.parentId}/departments` : `/companies/departments/${modal.id}`;
      }
      await apiFetch(url, { method: modal.mode === 'create' ? 'POST' : 'PATCH', body: JSON.stringify(body) });
      const label = KIND_LABEL[modal.kind];
      setModal(null);
      setNotice(`${label.charAt(0).toUpperCase() + label.slice(1)} ${modal.mode === 'create' ? 'created' : 'updated'} successfully.`);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save this change.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true); setError(null); setNotice(null);
    try {
      const { kind, node } = deleteTarget;
      const url = kind === 'company' ? `/companies/${node.id}` : kind === 'site' ? `/companies/sites/${node.id}` : kind === 'location' ? `/companies/locations/${node.id}` : `/companies/departments/${node.id}`;
      await apiFetch(url, { method: 'DELETE' });
      setDeleteTarget(null);
      setNotice(`${KIND_LABEL[kind].charAt(0).toUpperCase() + KIND_LABEL[kind].slice(1)} deleted successfully.`);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to delete this record.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState label="Loading companies…" />;
  if (error && companies.length === 0) return <ErrorState title="Unable to load companies" message={error} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">People & Organization</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Companies</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Manage companies and explore their complete operating structure from one visual workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void load()} loading={loading} icon={<RefreshCw size={16} />}>Refresh</Button>
          <Button onClick={() => openCreate('company')} icon={<Plus size={16} />}>Add Company</Button>
        </div>
      </div>

      {error ? <ErrorState title="Action could not be completed" message={error} onRetry={() => { setError(null); void load(); }} /> : null}
      {notice ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Companies', companies.length, Building2],
          ['Sites', totals.sites, MapPin],
          ['Locations', totals.locations, Layers3],
          ['Departments', totals.departments, Users],
        ].map(([label, value, Icon]) => <div key={String(label)} className="panel ui-surface-enter p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label as string}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value as number}</p></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><Icon size={19} /></div></div></div>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <section className="space-y-4">
          <div className="panel p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies…" className="field h-10 w-full pl-9" aria-label="Search companies" />
            </div>
          </div>

          {visibleCompanies.length === 0 ? <EmptyState title="No companies found" text={query ? 'Try another search term.' : 'Create your first company to begin building the organization structure.'} action={query ? 'Clear search' : 'Add Company'} onAction={() => query ? setQuery('') : openCreate('company')} /> : <div className="grid gap-4 md:grid-cols-2">{visibleCompanies.map((company) => {
            const count = structureCounts(company);
            const active = company.id === selected?.id;
            return <button key={company.id} type="button" onClick={() => setSelectedId(company.id)} className={`panel ui-interactive group text-left p-5 ${active ? 'ring-2 ring-[var(--theme-focus)] border-transparent' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><Building2 size={22} /></div>
                  <div className="min-w-0"><h2 className="truncate text-base font-bold text-slate-950">{company.name}</h2><p className="mt-0.5 text-xs text-slate-500">{company.code ?? 'No company code'}</p></div>
                </div>
                <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                {[['Sites', count.sites], ['Locations', count.locations], ['Departments', count.departments]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label as string}</p><p className="mt-1 font-bold text-slate-900">{value as number}</p></div>)}
              </div>
            </button>;
          })}</div>}
        </section>

        <section className="panel overflow-hidden xl:sticky xl:top-6 xl:self-start">
          {!selected ? <EmptyState title="Select a company" text="Choose a company to explore its structure." /> : <>
            <div className="border-b border-slate-100 bg-gradient-to-br from-[var(--theme-primary-soft)] to-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[var(--theme-link)] shadow-sm"><Building2 size={23} /></div><div className="min-w-0"><h2 className="truncate text-xl font-bold text-slate-950">{selected.name}</h2><p className="mt-0.5 text-sm text-slate-500">{selected.code ?? 'No company code'}</p></div></div>
                <div className="flex gap-1"><button type="button" onClick={() => openEdit('company', selected)} className="rounded-xl p-2 text-slate-500 hover:bg-white" aria-label="Edit company"><Edit3 size={15} /></button><button type="button" onClick={() => setDeleteTarget({ kind: 'company', node: selected })} className="rounded-xl p-2 text-red-500 hover:bg-red-50" aria-label="Delete company"><Trash2 size={15} /></button></div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2"><Badge tone="brand">{structureCounts(selected).sites} sites</Badge><Badge>{structureCounts(selected).locations} locations</Badge><Badge>{structureCounts(selected).departments} departments</Badge></div>
            </div>

            <div className="max-h-[620px] overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Organization structure</p><p className="mt-1 text-sm text-slate-600">Company → Site → Location → Department</p></div><Button size="sm" onClick={() => openCreate('site', selected.id)} icon={<Plus size={14} />}>Add Site</Button></div>
              {(selected.sites ?? []).length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><MapPin className="mx-auto text-slate-300" size={26} /><p className="mt-3 text-sm font-semibold text-slate-700">No sites yet</p><p className="mt-1 text-xs text-slate-500">Add the first operating site for this company.</p></div> : <div className="space-y-4">{(selected.sites ?? []).map((site) => <div key={site.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><MapPin size={16} /></div><div className="min-w-0"><p className="font-semibold text-slate-900">{site.name}</p><p className="mt-0.5 text-xs text-slate-500">{SITE_LABEL[site.type ?? 'plant']} · {(site.locations ?? []).length} locations</p></div></div><div className="flex gap-1"><button type="button" onClick={() => openEdit('site', site)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50" aria-label={`Edit ${site.name}`}><Edit3 size={13}/></button><button type="button" onClick={() => setDeleteTarget({ kind: 'site', node: site })} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label={`Delete ${site.name}`}><Trash2 size={13}/></button><button type="button" onClick={() => openCreate('location', site.id)} className="rounded-lg p-1.5 text-[var(--theme-link)] hover:bg-[var(--theme-primary-soft)]" aria-label={`Add location to ${site.name}`}><Plus size={13}/></button></div></div>
                {(site.locations ?? []).length > 0 ? <div className="mt-4 space-y-2 border-l-2 border-slate-100 pl-4">{(site.locations ?? []).map((location) => <div key={location.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{location.name}</p><p className="mt-0.5 text-xs text-slate-500">{(location.departments ?? []).length} departments</p></div><div className="flex gap-1"><button type="button" onClick={() => openEdit('location', location)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label={`Edit ${location.name}`}><Edit3 size={12}/></button><button type="button" onClick={() => setDeleteTarget({ kind: 'location', node: location })} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label={`Delete ${location.name}`}><Trash2 size={12}/></button><button type="button" onClick={() => openCreate('department', location.id)} className="rounded-lg p-1.5 text-[var(--theme-link)] hover:bg-white" aria-label={`Add department to ${location.name}`}><Plus size={12}/></button></div></div>{(location.departments ?? []).length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{(location.departments ?? []).map((department) => <span key={department.id} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600">{department.name}<button type="button" onClick={() => openEdit('department', department)} className="ml-1.5 text-slate-400 hover:text-[var(--theme-link)]" aria-label={`Edit ${department.name}`}><Edit3 size={11}/></button></span>)}</div> : null}</div>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">No locations configured for this site.</p>}
              </div>)}</div>}
            </div>
          </>}
        </section>
      </div>

      {modal ? <div className="fixed inset-0 z-[70] bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true"><div className="mx-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2.5rem)]">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">People & Organization</p><h2 className="mt-1 text-xl font-bold text-slate-950">{modal.mode === 'create' ? 'Add' : 'Edit'} {KIND_LABEL[modal.kind]}</h2></div><button type="button" onClick={() => !saving && setModal(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50" aria-label="Close"><X size={18}/></button></div>
        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto p-5"><div className="space-y-5">
          {modal.kind === 'site' ? <><FormSelect label="Company" id="company-select" value={modal.parentId ?? selected?.id ?? ''} onChange={(e) => setModal((state) => state ? { ...state, parentId: e.target.value } : state)} required><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</FormSelect><FormSelect label="Site type" id="site-type" value={modal.type ?? 'plant'} onChange={(e) => setModal((state) => state ? { ...state, type: e.target.value as SiteType } : state)} required>{SITE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</FormSelect></> : null}
          {modal.kind === 'location' ? <FormSelect label="Site" id="site-select" value={modal.parentId ?? ''} onChange={(e) => setModal((state) => state ? { ...state, parentId: e.target.value } : state)} required><option value="">Select site</option>{companies.flatMap((company) => (company.sites ?? []).map((site) => <option key={site.id} value={site.id}>{site.name} — {company.name}</option>))}</FormSelect> : null}
          {modal.kind === 'department' ? <FormSelect label="Location" id="location-select" value={modal.parentId ?? ''} onChange={(e) => setModal((state) => state ? { ...state, parentId: e.target.value } : state)} required><option value="">Select location</option>{companies.flatMap((company) => (company.sites ?? []).flatMap((site) => (site.locations ?? []).map((location) => <option key={location.id} value={location.id}>{location.name} — {site.name}</option>)))}</FormSelect> : null}
          <FormField label={modal.kind === 'company' ? 'Company name' : `${KIND_LABEL[modal.kind].charAt(0).toUpperCase() + KIND_LABEL[modal.kind].slice(1)} name`} id="organization-name" value={modal.name} onChange={(e) => setModal((state) => state ? { ...state, name: e.target.value } : state)} placeholder="Enter a name" required />
          {modal.kind === 'company' ? <FormField label="Company code" id="company-code" value={modal.code ?? ''} onChange={(e) => setModal((state) => state ? { ...state, code: e.target.value.toUpperCase() } : state)} placeholder="e.g. DEMO" hint="Use a short internal code for the company." /> : null}
        </div></form>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50/80 p-4"><Button variant="secondary" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button><Button type="submit" onClick={() => void submit(new Event('submit') as unknown as React.FormEvent)} loading={saving}>{modal.mode === 'create' ? 'Create' : 'Save changes'}</Button></div>
      </div></div> : null}

      <ConfirmDialog open={!!deleteTarget} title={`Delete ${deleteTarget ? KIND_LABEL[deleteTarget.kind] : 'item'}?`} message={deleteTarget ? `“${deleteTarget.node.name}” will be removed. If it is still in use, the system will explain what needs to be resolved.` : undefined} confirmLabel="Delete" cancelLabel="Cancel" danger loading={deleting} onCancel={() => !deleting && setDeleteTarget(null)} onConfirm={() => void remove()} />
    </div>
  );
}
