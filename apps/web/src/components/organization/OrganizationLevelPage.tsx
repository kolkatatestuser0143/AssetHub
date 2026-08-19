'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, Eye, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, Select } from '../ui';
import { ConfirmDialog } from '../confirm-dialog';
import { FormField, FormSelect } from '../form-field';

type SiteType = 'plant' | 'branch_office' | 'head_office' | 'other';
type Department = { id: string; name: string };
type Location = { id: string; name: string; departments?: Department[] };
type Site = { id: string; name: string; type?: SiteType; locations?: Location[] };
type Company = { id: string; name: string; code?: string; sites?: Site[] };
type Level = 'sites' | 'locations' | 'departments';
type Row = { id: string; name: string; companyId: string; company: string; siteId?: string; site?: string; locationId?: string; location?: string; type?: SiteType; childCount: number };
type FormState = { mode: 'create' | 'edit'; id?: string; name: string; type?: SiteType; companyId: string; siteId: string; locationId: string } | null;
type DetailState = Row | null;
type DeleteState = { id: string; name: string } | null;

const SITE_TYPES: Array<{ value: SiteType; label: string }> = [
  { value: 'plant', label: 'Plant' },
  { value: 'branch_office', label: 'Branch Office' },
  { value: 'head_office', label: 'Head Office' },
  { value: 'other', label: 'Other' },
];

const META: Record<Level, { title: string; description: string; addLabel: string; empty: string }> = {
  sites: { title: 'Sites', description: 'Manage plants, branch offices, head offices and other operating sites.', addLabel: 'Add Site', empty: 'Create a site under a company to start building your operating structure.' },
  locations: { title: 'Locations', description: 'Manage physical locations within each operating site.', addLabel: 'Add Location', empty: 'Create a location under a site to organize your physical spaces.' },
  departments: { title: 'Departments', description: 'Manage departments within each location.', addLabel: 'Add Department', empty: 'Create a department under a location to organize people and assets.' },
};

function flatten(companies: Company[], level: Level): Row[] {
  const rows: Row[] = [];
  for (const company of companies) {
    for (const site of company.sites ?? []) {
      if (level === 'sites') rows.push({ id: site.id, name: site.name, companyId: company.id, company: company.name, type: site.type, childCount: (site.locations ?? []).length });
      for (const location of site.locations ?? []) {
        if (level === 'locations') rows.push({ id: location.id, name: location.name, companyId: company.id, company: company.name, siteId: site.id, site: site.name, childCount: (location.departments ?? []).length });
        if (level === 'departments') {
          for (const department of location.departments ?? []) {
            rows.push({ id: department.id, name: department.name, companyId: company.id, company: company.name, siteId: site.id, site: site.name, locationId: location.id, location: location.name, childCount: 0 });
          }
        }
      }
    }
  }
  return rows;
}

export default function OrganizationLevelPage({ level }: { level: Level }) {
  const meta = META[level];
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [companyId, setCompanyId] = useState('ALL');
  const [siteId, setSiteId] = useState('ALL');
  const [locationId, setLocationId] = useState('ALL');
  const [siteType, setSiteType] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [form, setForm] = useState<FormState>(null);
  const [detail, setDetail] = useState<DetailState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/companies/hierarchy');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'We could not load the organization data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selectedCompany = companies.find((company) => company.id === companyId);
  const siteOptions = useMemo(() => {
    const source = companyId === 'ALL' ? companies.flatMap((company) => company.sites ?? []) : (selectedCompany?.sites ?? []);
    return source.filter((site, index, arr) => arr.findIndex((item) => item.id === site.id) === index);
  }, [companies, companyId, selectedCompany]);
  const locationOptions = useMemo(() => {
    const sites = siteId === 'ALL' ? siteOptions : siteOptions.filter((site) => site.id === siteId);
    const locations = sites.flatMap((site) => site.locations ?? []);
    return locations.filter((location, index, arr) => arr.findIndex((item) => item.id === location.id) === index);
  }, [siteId, siteOptions]);

  const rows = useMemo(() => flatten(companies, level), [companies, level]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (companyId !== 'ALL' && row.companyId !== companyId) return false;
      if (level !== 'sites' && siteId !== 'ALL' && row.siteId !== siteId) return false;
      if (level === 'departments' && locationId !== 'ALL' && row.locationId !== locationId) return false;
      if (level === 'sites' && siteType !== 'ALL' && row.type !== siteType) return false;
      if (!q) return true;
      return `${row.name} ${row.company} ${row.site ?? ''} ${row.location ?? ''} ${row.type ?? ''}`.toLowerCase().includes(q);
    });
  }, [rows, query, companyId, siteId, locationId, siteType, level]);

  useEffect(() => { setPage(1); }, [query, companyId, siteId, locationId, siteType, level]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(query || companyId !== 'ALL' || siteId !== 'ALL' || locationId !== 'ALL' || siteType !== 'ALL');

  function clearFilters() {
    setQuery(''); setCompanyId('ALL'); setSiteId('ALL'); setLocationId('ALL'); setSiteType('ALL'); setPage(1);
  }

  function openCreate() {
    setError(null); setSuccess(null); setForm({ mode: 'create', name: '', type: level === 'sites' ? 'plant' : undefined, companyId: companyId !== 'ALL' ? companyId : '', siteId: siteId !== 'ALL' ? siteId : '', locationId: locationId !== 'ALL' ? locationId : '' });
  }

  function openEdit(row: Row) {
    setError(null); setSuccess(null); setForm({ mode: 'edit', id: row.id, name: row.name, type: row.type, companyId: row.companyId, siteId: row.siteId ?? '', locationId: row.locationId ?? '' });
  }

  function companySitesForForm() {
    return (companies.find((company) => company.id === form?.companyId)?.sites ?? []);
  }

  function locationsForForm() {
    const sites = companySitesForForm();
    const selected = sites.find((site) => site.id === form?.siteId);
    return selected?.locations ?? [];
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    const name = form.name.trim();
    if (!name) { setError(`${meta.title.slice(0, -1)} name is required.`); return; }
    if (form.mode === 'create' && !form.companyId) { setError('Choose a company first.'); return; }
    if (level !== 'sites' && form.mode === 'create' && !form.siteId) { setError('Choose a site first.'); return; }
    if (level === 'departments' && form.mode === 'create' && !form.locationId) { setError('Choose a location first.'); return; }

    setSaving(true); setError(null); setSuccess(null);
    try {
      let url = '';
      let body: Record<string, unknown> = { name };
      if (level === 'sites') {
        url = form.mode === 'create' ? `/companies/${form.companyId}/sites` : `/companies/sites/${form.id}`;
        body = { name, type: form.type ?? 'plant' };
      } else if (level === 'locations') {
        url = form.mode === 'create' ? `/companies/sites/${form.siteId}/locations` : `/companies/locations/${form.id}`;
      } else {
        url = form.mode === 'create' ? `/companies/locations/${form.locationId}/departments` : `/companies/departments/${form.id}`;
      }
      await apiFetch(url, { method: form.mode === 'create' ? 'POST' : 'PATCH', body: JSON.stringify(body) });
      setForm(null);
      await load();
      setSuccess(`${meta.title.slice(0, -1)} ${form.mode === 'create' ? 'created' : 'updated'} successfully.`);
    } catch (err: any) {
      setError(err?.message || `We could not save this ${meta.title.slice(0, -1).toLowerCase()}.`);
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true); setError(null); setSuccess(null);
    try {
      const url = level === 'sites' ? `/companies/sites/${deleteTarget.id}` : level === 'locations' ? `/companies/locations/${deleteTarget.id}` : `/companies/departments/${deleteTarget.id}`;
      await apiFetch(url, { method: 'DELETE' });
      const removedName = deleteTarget.name;
      setDeleteTarget(null);
      await load();
      setSuccess(`${meta.title.slice(0, -1)} “${removedName}” was deleted successfully.`);
    } catch (err: any) {
      setError(err?.message || `We could not delete this ${meta.title.slice(0, -1).toLowerCase()}. It may still contain related records.`);
    } finally { setDeleting(false); }
  }

  if (loading) return <LoadingState label={`Loading ${meta.title.toLowerCase()}…`} />;
  if (error && !rows.length) return <ErrorState title={`Unable to load ${meta.title.toLowerCase()}`} message={error} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title={meta.title} description={meta.description} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">People & Organization</p>
        <Button onClick={openCreate} icon={<Plus size={16} />}>{meta.addLabel}</Button>
      </div>

      {error ? <ErrorState title="We could not complete that action" message={error} onRetry={() => { setError(null); void load(); }} /> : null}
      {success ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</div> : null}

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_repeat(4,minmax(150px,200px))_auto]">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${meta.title.toLowerCase()}…`} className="field h-10 w-full pl-9" aria-label={`Search ${meta.title.toLowerCase()}`} />
            </label>
            <Select aria-label="Filter by company" value={companyId} onChange={(event) => { setCompanyId(event.target.value); setSiteId('ALL'); setLocationId('ALL'); }}>
              <option value="ALL">All companies</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
            {level !== 'sites' ? <Select aria-label="Filter by site" value={siteId} onChange={(event) => { setSiteId(event.target.value); setLocationId('ALL'); }}>
              <option value="ALL">All sites</option>
              {siteOptions.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </Select> : <Select aria-label="Filter by site type" value={siteType} onChange={(event) => setSiteType(event.target.value)}>
              <option value="ALL">All site types</option>
              {SITE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>}
            {level === 'departments' ? <Select aria-label="Filter by location" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="ALL">All locations</option>
              {locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select> : <div className="hidden xl:block" />}
            <Select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              <option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option>
            </Select>
            {hasFilters ? <Button variant="ghost" onClick={clearFilters} size="sm"><X size={15} />Clear</Button> : <Badge>{filtered.length} {meta.title.toLowerCase()}</Badge>}
          </div>
        </div>

        {pageRows.length === 0 ? (
          <EmptyState title={hasFilters ? `No ${meta.title.toLowerCase()} match these filters` : `No ${meta.title.toLowerCase()} found`} text={hasFilters ? 'Try a different company, parent, type or search term.' : meta.empty} action={hasFilters ? 'Clear filters' : meta.addLabel.toLowerCase()} onAction={hasFilters ? clearFilters : openCreate} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Company</th>
                {level !== 'sites' ? <th className="px-5 py-3 font-semibold">Site</th> : <th className="px-5 py-3 font-semibold">Type</th>}
                {level === 'departments' ? <th className="px-5 py-3 font-semibold">Location</th> : null}
                <th className="px-5 py-3 font-semibold">Child items</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row) => <tr key={row.id} className="ui-table-row">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]">{level === 'sites' ? <Building2 size={16} /> : <MapPin size={16} />}</span><div><div className="font-semibold text-slate-900">{row.name}</div><div className="text-xs text-slate-500">ID hidden from normal users</div></div></div></td>
                  <td className="px-5 py-4 text-slate-600">{row.company}</td>
                  {level !== 'sites' ? <td className="px-5 py-4 text-slate-600">{row.site}</td> : <td className="px-5 py-4 text-slate-600">{SITE_TYPES.find((type) => type.value === row.type)?.label ?? 'Other'}</td>}
                  {level === 'departments' ? <td className="px-5 py-4 text-slate-600">{row.location}</td> : null}
                  <td className="px-5 py-4"><Badge>{row.childCount}</Badge></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => setDetail(row)} icon={<Eye size={15} />}>View</Button><Button variant="ghost" size="sm" onClick={() => openEdit(row)} icon={<Pencil size={15} />}>Edit</Button><Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: row.id, name: row.name })} icon={<Trash2 size={15} />}>Delete</Button></div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 ? <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="text-slate-500">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</div><div className="flex items-center gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span className="min-w-20 text-center text-xs font-semibold text-slate-600">Page {page} / {totalPages}</span><Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button></div></div> : null}
      </section>

      {form ? <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/40 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true"><div className="h-full w-full overflow-y-auto bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">{form.mode === 'create' ? 'Create' : 'Edit'} {meta.title.slice(0, -1)}</div><h2 className="mt-1 text-lg font-semibold text-slate-950">{form.name || `New ${meta.title.slice(0, -1).toLowerCase()}`}</h2></div><button type="button" onClick={() => !saving && setForm(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50" aria-label="Close"><X size={18} /></button></div><form onSubmit={submit} className="space-y-5 p-5">
        <FormField label="Name" value={form.name} onChange={(value) => setForm((state) => state ? { ...state, name: value } : state)} placeholder={`${meta.title.slice(0, -1)} name`} required />
        {level === 'sites' ? <FormSelect label="Site type" value={form.type ?? 'plant'} onChange={(value) => setForm((state) => state ? { ...state, type: value as SiteType } : state)} options={SITE_TYPES} /> : null}
        <FormSelect label="Company" value={form.companyId} onChange={(value) => setForm((state) => state ? { ...state, companyId: value, siteId: '', locationId: '' } : state)} options={[{ value: '', label: 'Select a company' }, ...companies.map((company) => ({ value: company.id, label: company.name }))]} disabled={form.mode === 'edit'} required />
        {level !== 'sites' ? <FormSelect label="Site" value={form.siteId} onChange={(value) => setForm((state) => state ? { ...state, siteId: value, locationId: '' } : state)} options={[{ value: '', label: 'Select a site' }, ...companySitesForForm().map((site) => ({ value: site.id, label: site.name }))]} disabled={form.mode === 'edit'} required /> : null}
        {level === 'departments' ? <FormSelect label="Location" value={form.locationId} onChange={(value) => setForm((state) => state ? { ...state, locationId: value } : state)} options={[{ value: '', label: 'Select a location' }, ...locationsForForm().map((location) => ({ value: location.id, label: location.name }))]} disabled={form.mode === 'edit'} required /> : null}
        {form.mode === 'edit' ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">The parent scope is shown for context and cannot be changed during editing. Create the item under a different parent if you need to reorganize the hierarchy.</div> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={() => setForm(null)} disabled={saving}>Cancel</Button><Button type="submit" loading={saving}>{form.mode === 'create' ? `Create ${meta.title.slice(0, -1)}` : 'Save changes'}</Button></div>
      </form></div></div> : null}

      {detail ? <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-link)]">Details</div><h2 className="mt-1 text-xl font-semibold text-slate-950">{detail.name}</h2></div><button type="button" onClick={() => setDetail(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50" aria-label="Close details"><X size={18} /></button></div><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company</div><div className="mt-1 font-semibold text-slate-900">{detail.company}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Parent</div><div className="mt-1 font-semibold text-slate-900">{detail.location ?? detail.site ?? 'Company'}</div></div></div>{detail.type ? <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site type</div><div className="mt-1 font-semibold text-slate-900">{SITE_TYPES.find((type) => type.value === detail.type)?.label ?? 'Other'}</div></div> : null}<div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Structure</div><div className="mt-2 text-sm leading-6 text-slate-600">{detail.childCount > 0 ? `${detail.childCount} child item${detail.childCount === 1 ? '' : 's'} currently linked.` : 'No child items are currently linked.'}</div></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" onClick={() => setDetail(null)}>Close</Button><Button onClick={() => { setDetail(null); openEdit(detail); }} icon={<Pencil size={15} />}>Edit</Button></div></div></div></div> : null}

      <ConfirmDialog open={!!deleteTarget} title={`Delete ${meta.title.slice(0, -1).toLowerCase()}?`} message={deleteTarget ? `“${deleteTarget.name}” will be permanently removed if it has no dependent records. If related records still exist, the operation will be blocked safely.` : undefined} confirmLabel="Delete" cancelLabel="Cancel" danger loading={deleting} onCancel={() => !deleting && setDeleteTarget(null)} onConfirm={() => void remove()} />
    </div>
  );
}
