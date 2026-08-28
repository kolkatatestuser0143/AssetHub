'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, ChevronRight, Layers3, MapPin, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';
import { Badge, Button, EmptyState, ErrorState, LoadingState } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { FormField, FormSelect } from '../../../components/form-field';
import { Modal, ModalBody } from '../../../components/modal';

type SiteType = 'plant' | 'branch_office' | 'head_office' | 'other';
type Node = { id: string; name: string; code?: string; type?: SiteType };
type Department = Node;
type Location = Node & { departments?: Department[] };
type Site = Node & { locations?: Location[] };
type Company = Node & { sites?: Site[] };
type EntityKind = 'company' | 'site' | 'location' | 'department';
type Editor = { kind: EntityKind; mode: 'create' | 'edit'; id?: string; parentId?: string; name: string; code?: string; type?: SiteType } | null;

const SITE_TYPES = [
  { value: 'plant', label: 'Plant' },
  { value: 'branch_office', label: 'Branch Office' },
  { value: 'head_office', label: 'Head Office' },
  { value: 'other', label: 'Other' },
];
const labels: Record<EntityKind, string> = { company: 'Company', site: 'Site', location: 'Location', department: 'Department' };

function counts(company: Company) {
  const sites = company.sites ?? [];
  const locations = sites.flatMap((s) => s.locations ?? []);
  const departments = locations.flatMap((l) => l.departments ?? []);
  return { sites: sites.length, locations: locations.length, departments: departments.length };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: EntityKind; id: string; name: string } | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await apiFetch('/companies/hierarchy');
      const next = Array.isArray(data) ? data as Company[] : [];
      setCompanies(next);
      setSelectedId((current) => current && next.some((c) => c.id === current) ? current : next[0]?.id ?? null);
    } catch (err: any) { setError(err?.message || 'Unable to load companies.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((c) => !q || `${c.name} ${c.code ?? ''}`.toLowerCase().includes(q));
  }, [companies, query]);
  const selected = companies.find((c) => c.id === selectedId) ?? visible[0] ?? null;
  const total = useMemo(() => companies.reduce((a, c) => { const x = counts(c); a.sites += x.sites; a.locations += x.locations; a.departments += x.departments; return a; }, { sites: 0, locations: 0, departments: 0 }), [companies]);

  function openCreate(kind: EntityKind, parentId?: string) {
    setError(null); setNotice(null);
    setEditor({ kind, mode: 'create', parentId, name: '', code: kind === 'company' ? '' : undefined, type: kind === 'site' ? 'plant' : undefined });
  }
  function openEdit(kind: EntityKind, node: Node) {
    setError(null); setNotice(null);
    setEditor({ kind, mode: 'edit', id: node.id, name: node.name, code: node.code, type: kind === 'site' ? (node.type ?? 'plant') : undefined });
  }

  async function save() {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) { setError(`Enter a ${labels[editor.kind].toLowerCase()} name.`); return; }
    setSaving(true); setError(null);
    try {
      let url = ''; let body: Record<string, unknown> = { name };
      if (editor.kind === 'company') { url = editor.mode === 'create' ? '/companies' : `/companies/${editor.id}`; body = { name, code: editor.code?.trim().toUpperCase() }; }
      if (editor.kind === 'site') { if (editor.mode === 'create' && !editor.parentId) throw new Error('Select a company first.'); url = editor.mode === 'create' ? `/companies/${editor.parentId}/sites` : `/companies/sites/${editor.id}`; body = { name, type: editor.type ?? 'plant' }; }
      if (editor.kind === 'location') { if (editor.mode === 'create' && !editor.parentId) throw new Error('Select a site first.'); url = editor.mode === 'create' ? `/companies/sites/${editor.parentId}/locations` : `/companies/locations/${editor.id}`; }
      if (editor.kind === 'department') { if (editor.mode === 'create' && !editor.parentId) throw new Error('Select a location first.'); url = editor.mode === 'create' ? `/companies/locations/${editor.parentId}/departments` : `/companies/departments/${editor.id}`; }
      await apiFetch(url, { method: editor.mode === 'create' ? 'POST' : 'PATCH', body: JSON.stringify(body) });
      setNotice(`${labels[editor.kind]} ${editor.mode === 'create' ? 'created' : 'updated'} successfully.`);
      setEditor(null); await load();
    } catch (err: any) { setError(err?.message || `Unable to save this ${labels[editor.kind].toLowerCase()}.`); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true); setError(null);
    try {
      const url = deleteTarget.kind === 'company' ? `/companies/${deleteTarget.id}` : deleteTarget.kind === 'site' ? `/companies/sites/${deleteTarget.id}` : deleteTarget.kind === 'location' ? `/companies/locations/${deleteTarget.id}` : `/companies/departments/${deleteTarget.id}`;
      await apiFetch(url, { method: 'DELETE' });
      setNotice(`${deleteTarget.kind.charAt(0).toUpperCase() + deleteTarget.kind.slice(1)} deleted successfully.`);
      setDeleteTarget(null); await load();
    } catch (err: any) { setError(err?.message || 'Unable to delete this item.'); }
    finally { setDeleting(false); }
  }

  if (loading) return <LoadingState label="Loading companies…" />;
  if (error && companies.length === 0) return <ErrorState title="Unable to load companies" message={error} onRetry={() => void load()} />;

  const metrics: Array<[string, number, LucideIcon]> = [
    ['Companies', companies.length, Building2],
    ['Sites', total.sites, MapPin],
    ['Locations', total.locations, Layers3],
    ['Departments', total.departments, Users],
  ];

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">People & Organization</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Companies</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Manage companies and explore their complete operating structure from one visual workspace.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void load()} loading={loading} icon={<RefreshCw size={16}/>}>Refresh</Button><Button onClick={() => openCreate('company')} icon={<Plus size={16}/>}>Add Company</Button></div></div>
    {error ? <ErrorState title="Action could not be completed" message={error} onRetry={() => { setError(null); void load(); }}/> : null}
    {notice ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <div key={label} className="panel p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{String(value)}</p></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><Icon size={19}/></div></div></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
      <section className="space-y-4"><div className="panel p-4"><FormField label="Search companies" id="company-search" hideLabel value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies…" className="h-10 pl-9" /></div>{visible.length === 0 ? <EmptyState title="No companies found" text={query ? 'Try another search term.' : 'Create your first company.'} action={query ? 'Clear search' : 'Add Company'} onAction={() => query ? setQuery('') : openCreate('company')}/> : <div className="grid gap-4 md:grid-cols-2">{visible.map((company) => { const c = counts(company); const active = company.id === selected?.id; return <button key={company.id} type="button" onClick={() => setSelectedId(company.id)} className={`panel ui-interactive group p-5 text-left ${active ? 'ring-2 ring-[var(--theme-focus)] border-transparent' : ''}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-link)]"><Building2 size={22}/></div><div className="min-w-0"><h2 className="truncate text-base font-bold text-slate-950">{company.name}</h2><p className="text-xs text-slate-500">{company.code ?? 'No company code'}</p></div></div><ChevronRight size={18} className="text-slate-300"/></div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">{[['Sites', c.sites], ['Locations', c.locations], ['Departments', c.departments]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{String(label)}</p><p className="mt-1 font-bold text-slate-900">{String(value)}</p></div>)}</div></button>; })}</div>}</section>
      <section className="panel overflow-hidden xl:sticky xl:top-6 xl:self-start">{!selected ? <EmptyState title="Select a company" text="Choose a company to explore its structure."/> : <><div className="border-b border-slate-100 bg-gradient-to-br from-[var(--theme-primary-soft)] to-white p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[var(--theme-link)] shadow-sm"><Building2 size={23}/></div><div className="min-w-0"><h2 className="truncate text-xl font-bold text-slate-950">{selected.name}</h2><p className="text-sm text-slate-500">{selected.code ?? 'No company code'}</p></div></div><div className="flex gap-1"><button type="button" onClick={() => openEdit('company', selected)} className="rounded-xl p-2 text-slate-500 hover:bg-white" aria-label="Edit company">Edit</button><button type="button" onClick={() => setDeleteTarget({kind:'company',id:selected.id,name:selected.name})} className="rounded-xl p-2 text-red-500 hover:bg-red-50" aria-label="Delete company"><Trash2 size={15}/></button></div></div><div className="mt-5 grid grid-cols-3 gap-2"><Badge tone="brand">{counts(selected).sites} sites</Badge><Badge>{counts(selected).locations} locations</Badge><Badge>{counts(selected).departments} departments</Badge></div></div><div className="max-h-[620px] overflow-y-auto p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Organization structure</p><p className="text-sm text-slate-600">Company → Site → Location → Department</p></div><Button size="sm" onClick={() => openCreate('site', selected.id)} icon={<Plus size={14}/>}>Add Site</Button></div>{(selected.sites ?? []).map((site) => <div key={site.id} className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{site.name}</p><p className="text-xs text-slate-500">{site.type?.replaceAll('_',' ') ?? 'Plant'} · {(site.locations ?? []).length} locations</p></div><div className="flex gap-1"><button type="button" onClick={() => openEdit('site', site)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">Edit</button><button type="button" onClick={() => setDeleteTarget({kind:'site',id:site.id,name:site.name})} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={13}/></button><button type="button" onClick={() => openCreate('location',site.id)} className="rounded-lg p-2 text-[var(--theme-link)] hover:bg-[var(--theme-primary-soft)]"><Plus size={13}/></button></div></div>{(site.locations ?? []).map((location) => <div key={location.id} className="mt-3 rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-800">{location.name}</p><p className="text-xs text-slate-500">{(location.departments ?? []).length} departments</p></div><div className="flex gap-1"><button type="button" onClick={() => openEdit('location',location)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-white">Edit</button><button type="button" onClick={() => setDeleteTarget({kind:'location',id:location.id,name:location.name})} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={12}/></button><button type="button" onClick={() => openCreate('department',location.id)} className="rounded-lg p-2 text-[var(--theme-link)] hover:bg-white"><Plus size={12}/></button></div></div></div>)}</div>)}{(selected.sites ?? []).length===0 ? <EmptyState title="No sites yet" text="Add the first operating site for this company." action="Add Site" onAction={() => openCreate('site',selected.id)}/> : null}</div></>}</section>
    </div>

    <Modal open={!!editor} onClose={() => !saving && setEditor(null)} title={`${editor?.mode === 'create' ? 'Add' : 'Edit'} ${editor ? labels[editor.kind] : ''}`} description="Changes are saved to the current organization scope." variant="drawer-right" size="lg" closeOnBackdrop={!saving}>
      <ModalBody><div className="space-y-5">
        {editor?.kind === 'site' ? <><FormSelect label="Company" id="company-select" value={editor.parentId ?? selected?.id ?? ''} onChange={(e) => setEditor((s) => s ? {...s,parentId:e.target.value}:s)} required><option value="">Select company</option>{companies.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</FormSelect><FormSelect label="Site type" id="site-type" value={editor.type ?? 'plant'} onChange={(e)=>setEditor((s)=>s?{...s,type:e.target.value as SiteType}:s)} required>{SITE_TYPES.map((t)=><option key={t.value} value={t.value}>{t.label}</option>)}</FormSelect></> : null}
        {editor?.kind === 'location' ? <FormSelect label="Site" id="site-select" value={editor.parentId ?? ''} onChange={(e)=>setEditor((s)=>s?{...s,parentId:e.target.value}:s)} required><option value="">Select site</option>{companies.flatMap((c)=>(c.sites??[]).map((s)=><option key={s.id} value={s.id}>{s.name} — {c.name}</option>))}</FormSelect> : null}
        {editor?.kind === 'department' ? <FormSelect label="Location" id="location-select" value={editor.parentId ?? ''} onChange={(e)=>setEditor((s)=>s?{...s,parentId:e.target.value}:s)} required><option value="">Select location</option>{companies.flatMap((c)=>(c.sites??[]).flatMap((s)=>(s.locations??[]).map((l)=><option key={l.id} value={l.id}>{l.name} — {s.name}</option>)))}</FormSelect> : null}
        {editor?.kind ? <FormField label={`${labels[editor.kind]} name`} id="organization-name" value={editor.name} onChange={(e)=>setEditor((s)=>s?{...s,name:e.target.value}:s)} placeholder={`Enter ${labels[editor.kind].toLowerCase()} name`} required/> : null}
        {editor?.kind === 'company' ? <FormField label="Company code" id="company-code" value={editor.code ?? ''} onChange={(e)=>setEditor((s)=>s?{...s,code:e.target.value.toUpperCase()}:s)} placeholder="e.g. DEMO"/> : null}
      </div></ModalBody><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={()=>setEditor(null)} disabled={saving}>Cancel</Button><Button onClick={()=>void save()} loading={saving}>{editor?.mode === 'create' ? 'Create' : 'Save changes'}</Button></div>
    </Modal>
    <ConfirmDialog open={!!deleteTarget} title={`Delete ${deleteTarget ? labels[deleteTarget.kind] : 'item'}?`} message={deleteTarget ? `“${deleteTarget.name}” will be removed. If it is still in use, the system will explain what needs to be resolved.` : undefined} confirmLabel="Delete" cancelLabel="Cancel" danger loading={deleting} onCancel={()=>!deleting&&setDeleteTarget(null)} onConfirm={()=>void remove()}/>
  </div>;
}