'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Edit3, MapPin, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Badge, Button, EmptyState, ErrorState, LoadingState } from '../ui';
import { ConfirmDialog } from '../confirm-dialog';
import { FormField, FormSelect } from '../form-field';

type Department = { id: string; name: string };
type Location = { id: string; name: string; departments?: Department[] };
type Site = { id: string; name: string; type?: string; locations?: Location[] };
type Company = { id: string; name: string; code?: string; sites?: Site[] };
type Level = 'sites' | 'locations' | 'departments';
type Row = { id: string; name: string; companyId: string; company: string; siteId?: string; site?: string; locationId?: string; location?: string; type?: string };
type Editor = { mode: 'create' | 'edit'; id?: string; name: string; companyId?: string; siteId?: string; locationId?: string; type?: string } | null;
type DeleteTarget = { id: string; name: string } | null;

const META: Record<Level, { title: string; description: string; parent: string }> = {
  sites: { title: 'Sites', description: 'Manage plants, branch offices, head offices and other operating sites.', parent: 'Company' },
  locations: { title: 'Locations', description: 'Manage locations within each operating site.', parent: 'Site' },
  departments: { title: 'Departments', description: 'Manage departments within each location.', parent: 'Location' },
};

const SITE_TYPES = [
  { value: 'plant', label: 'Plant' },
  { value: 'branch_office', label: 'Branch Office' },
  { value: 'head_office', label: 'Head Office' },
  { value: 'other', label: 'Other' },
];

function flatten(companies: Company[], level: Level): Row[] {
  const rows: Row[] = [];
  for (const company of companies) {
    for (const site of company.sites ?? []) {
      if (level === 'sites') rows.push({ id: site.id, name: site.name, companyId: company.id, company: company.name, type: site.type });
      for (const location of site.locations ?? []) {
        if (level === 'locations') rows.push({ id: location.id, name: location.name, companyId: company.id, company: company.name, siteId: site.id, site: site.name });
        for (const department of location.departments ?? []) {
          if (level === 'departments') rows.push({ id: department.id, name: department.name, companyId: company.id, company: company.name, siteId: site.id, site: site.name, locationId: location.id, location: location.name });
        }
      }
    }
  }
  return rows;
}

export default function OrganizationLevelPage({ level }: { level: Level }) {
  const meta = META[level];
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [detail, setDetail] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/companies/hierarchy');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || `Unable to load ${meta.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const sites = useMemo(
    () => companies.filter((c) => companyFilter === 'ALL' || c.id === companyFilter).flatMap((c) => (c.sites ?? []).map((s) => ({ id: s.id, name: s.name, companyId: c.id }))),
    [companies, companyFilter],
  );

  const locations = useMemo(
    () => companies.filter((c) => companyFilter === 'ALL' || c.id === companyFilter).flatMap((c) => (c.sites ?? []).filter((s) => siteFilter === 'ALL' || s.id === siteFilter).flatMap((s) => (s.locations ?? []).map((l) => ({ id: l.id, name: l.name, siteId: s.id, companyId: c.id })))),
    [companies, companyFilter, siteFilter],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flatten(companies, level).filter((row) => {
      if (companyFilter !== 'ALL' && row.companyId !== companyFilter) return false;
      if (level !== 'sites' && siteFilter !== 'ALL' && row.siteId !== siteFilter) return false;
      if (level === 'departments' && locationFilter !== 'ALL' && row.locationId !== locationFilter) return false;
      if (level === 'sites' && typeFilter !== 'ALL' && (row.type ?? 'other') !== typeFilter) return false;
      if (!q) return true;
      return `${row.name} ${row.company} ${row.site ?? ''} ${row.location ?? ''} ${row.type ?? ''}`.toLowerCase().includes(q);
    });
  }, [companies, level, query, companyFilter, siteFilter, locationFilter, typeFilter]);

  function clearFilters() {
    setQuery(''); setCompanyFilter('ALL'); setSiteFilter('ALL'); setLocationFilter('ALL'); setTypeFilter('ALL');
  }

  function openCreate() {
    setNotice(null); setError(null);
    setEditor({ mode: 'create', name: '', type: level === 'sites' ? 'plant' : undefined });
  }

  function openEdit(row: Row) {
    setNotice(null); setError(null);
    setEditor({ mode: 'edit', id: row.id, name: row.name, companyId: row.companyId, siteId: row.siteId, locationId: row.locationId, type: row.type ?? 'plant' });
  }

  async function save() {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) { setError('Enter a name before saving.'); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      let url = '';
      let body: Record<string, unknown> = { name };
      const method = editor.mode === 'create' ? 'POST' : 'PATCH';
      if (level === 'sites') {
        if (editor.mode === 'create' && !editor.companyId) throw new Error('Select a company for this site.');
        body = { name, type: editor.type ?? 'plant' };
        url = editor.mode === 'create' ? `/companies/${editor.companyId}/sites` : `/companies/sites/${editor.id}`;
      } else if (level === 'locations') {
        if (editor.mode === 'create' && !editor.siteId) throw new Error('Select a site for this location.');
        url = editor.mode === 'create' ? `/companies/sites/${editor.siteId}/locations` : `/companies/locations/${editor.id}`;
      } else {
        if (editor.mode === 'create' && !editor.locationId) throw new Error('Select a location for this department.');
        url = editor.mode === 'create' ? `/companies/locations/${editor.locationId}/departments` : `/companies/departments/${editor.id}`;
      }
      await apiFetch(url, { method, body: JSON.stringify(body) });
      setEditor(null);
      setNotice(`${meta.title.slice(0, -1)} ${editor.mode === 'create' ? 'created' : 'updated'} successfully.`);
      await load();
    } catch (err: any) {
      setError(err?.message || `Unable to save ${meta.title.toLowerCase().slice(0, -1)}.`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const url = level === 'sites' ? `/companies/sites/${deleteTarget.id}` : level === 'locations' ? `/companies/locations/${deleteTarget.id}` : `/companies/departments/${deleteTarget.id}`;
      await apiFetch(url, { method: 'DELETE' });
      setDeleteTarget(null);
      setNotice(`${meta.title.slice(0, -1)} deleted successfully.`);
      await load();
    } catch (err: any) {
      setError(err?.message || `Unable to delete this ${meta.title.slice(0, -1).toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label={`Loading ${meta.title.toLowerCase()}…`} />;
  if (error && companies.length === 0) return <ErrorState title={`Unable to load ${meta.title.toLowerCase()}`} message={error} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">People & Organization</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{meta.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">{meta.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void load()} loading={loading} icon={<RefreshCw size={16} />}>Refresh</Button>
          <Button onClick={openCreate} icon={<Plus size={16} />}>Add {meta.title.slice(0, -1)}</Button>
        </div>
      </div>

      {error ? <ErrorState title="Action could not be completed" message={error} onRetry={() => { setError(null); void load(); }} /> : null}
      {notice ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div> : null}

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative w-full xl:max-w-md">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${meta.title.toLowerCase()}…`} className="field h-10 w-full pl-9" aria-label={`Search ${meta.title.toLowerCase()}`} />
            </div>
            <select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setSiteFilter('ALL'); setLocationFilter('ALL'); }} className="field h-10 w-auto min-w-44" aria-label="Filter by company"><option value="ALL">All companies</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            {level === 'sites' ? <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="field h-10 w-auto min-w-40" aria-label="Filter by site type"><option value="ALL">All site types</option>{SITE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select> : null}
            {level !== 'sites' ? <select value={siteFilter} onChange={(e) => { setSiteFilter(e.target.value); setLocationFilter('ALL'); }} className="field h-10 w-auto min-w-40" aria-label="Filter by site"><option value="ALL">All sites</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select> : null}
            {level === 'departments' ? <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="field h-10 w-auto min-w-44" aria-label="Filter by location"><option value="ALL">All locations</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select> : null}
            {(query || companyFilter !== 'ALL' || siteFilter !== 'ALL' || locationFilter !== 'ALL' || typeFilter !== 'ALL') ? <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
            <Badge>{rows.length} {meta.title.toLowerCase()}</Badge>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState title={`No ${meta.title.toLowerCase()} found`} text="Try changing the filters or create a new record." action={`Add ${meta.title.slice(0, -1)}`} onAction={openCreate} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Name</th><th className="px-5 py-3 font-semibold">Company</th>{level !== 'sites' ? <th className="px-5 py-3 font-semibold">Site</th> : <th className="px-5 py-3 font-semibold">Type</th>}{level === 'departments' ? <th className="px-5 py-3 font-semibold">Location</th> : null}<th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row.id} className="ui-table-row"><td className="px-5 py-4"><button type="button" onClick={() => setDetail(row)} className="flex items-center gap-3 text-left"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--theme-primary-soft)] text-[var(--theme-link)]">{level === 'sites' ? <Building2 size={16} /> : <MapPin size={16} />}</span><span className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{row.name}</span></button></td><td className="px-5 py-4 text-slate-600">{row.company}</td>{level !== 'sites' ? <td className="px-5 py-4 text-slate-600">{row.site}</td> : <td className="px-5 py-4 capitalize text-slate-600">{row.type ? row.type.replaceAll('_', ' ') : 'Other'}</td>}{level === 'departments' ? <td className="px-5 py-4 text-slate-600">{row.location}</td> : null}<td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => setDetail(row)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`View ${row.name}`}>View</button><button type="button" onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Edit ${row.name}`}><Edit3 size={15} /></button><button type="button" onClick={() => setDeleteTarget({ id: row.id, name: row.name })} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Delete ${row.name}`}><Trash2 size={15} /></button></div></td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editor ? <div className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm"><div className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">People & Organization</p><h2 className="mt-1 text-xl font-bold text-slate-950">{editor.mode === 'create' ? `Add ${meta.title.slice(0, -1)}` : `Edit ${meta.title.slice(0, -1)}`}</h2></div><button type="button" onClick={() => !busy && setEditor(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div><div className="space-y-4 pt-5">{level === 'sites' ? <><FormSelect label="Company" value={editor.companyId ?? ''} onChange={(value) => setEditor((s) => s ? { ...s, companyId: value } : s)} options={companies.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select company" required /><FormSelect label="Site type" value={editor.type ?? 'plant'} onChange={(value) => setEditor((s) => s ? { ...s, type: value } : s)} options={SITE_TYPES} required /></> : level === 'locations' ? <FormSelect label="Site" value={editor.siteId ?? ''} onChange={(value) => setEditor((s) => s ? { ...s, siteId: value } : s)} options={companies.flatMap((c) => (c.sites ?? []).map((site) => ({ value: site.id, label: `${site.name} — ${c.name}` })))} placeholder="Select site" required /> : <FormSelect label="Location" value={editor.locationId ?? ''} onChange={(value) => setEditor((s) => s ? { ...s, locationId: value } : s)} options={companies.flatMap((c) => (c.sites ?? []).flatMap((site) => (site.locations ?? []).map((location) => ({ value: location.id, label: `${location.name} — ${site.name}` }))))} placeholder="Select location" required />}{editor.mode === 'create' || editor.id ? <FormField label="Name" value={editor.name} onChange={(value) => setEditor((s) => s ? { ...s, name: value } : s)} placeholder={`Enter ${meta.title.slice(0, -1).toLowerCase()} name`} required /> : null}<div className="flex justify-end gap-2 pt-4"><Button variant="secondary" onClick={() => setEditor(null)} disabled={busy}>Cancel</Button><Button onClick={() => void save()} loading={busy}>{editor.mode === 'create' ? 'Create' : 'Save changes'}</Button></div></div></div></div> : null}

      {detail ? <div className="fixed inset-0 z-[65] bg-slate-950/35 backdrop-blur-sm"><div className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">{meta.title.slice(0, -1)} details</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{detail.name}</h2><p className="mt-1 text-sm text-slate-500">{detail.company}</p></div><button type="button" onClick={() => setDetail(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{detail.type ? <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Type</p><p className="mt-1 font-semibold capitalize text-slate-800">{detail.type.replaceAll('_', ' ')}</p></div> : null}{detail.site ? <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Site</p><p className="mt-1 font-semibold text-slate-800">{detail.site}</p></div> : null}{detail.location ? <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Location</p><p className="mt-1 font-semibold text-slate-800">{detail.location}</p></div> : null}</div><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDetail(null)}>Close</Button><Button onClick={() => { setDetail(null); openEdit(detail); }} icon={<Edit3 size={15} />}>Edit</Button></div></div></div> : null}

      <ConfirmDialog open={!!deleteTarget} title={`Delete ${meta.title.slice(0, -1).toLowerCase()}?`} message={deleteTarget ? `“${deleteTarget.name}” will be removed. If it is still in use, the system will keep the record safe and explain what needs to be resolved.` : undefined} confirmLabel="Delete" cancelLabel="Cancel" danger loading={busy} onCancel={() => !busy && setDeleteTarget(null)} onConfirm={() => void remove()} />
    </div>
  );
}
