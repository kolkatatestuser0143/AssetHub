'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Edit3, Loader2, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Node = { id: string; name: string; code?: string };
type Company = Node;
type BusinessUnit = Node;
type Plant = Node;
type Location = Node;
type Department = Node;
type NodeType = 'company' | 'businessUnit' | 'plant' | 'location' | 'department';

type ModalState = { mode: 'create' | 'edit'; type: NodeType; id?: string; parentId?: string; name: string; code: string } | null;

const labels: Record<NodeType, string> = { company: 'Company', businessUnit: 'Business unit', plant: 'Plant', location: 'Location', department: 'Department' };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [businessUnits, setBusinessUnits] = useState<Record<string, BusinessUnit[]>>({});
  const [plants, setPlants] = useState<Record<string, Plant[]>>({});
  const [locations, setLocations] = useState<Record<string, Location[]>>({});
  const [departments, setDepartments] = useState<Record<string, Department[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingNode, setLoadingNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);

  async function loadCompanies() {
    setLoading(true); setError(null);
    try { const data = await apiFetch('/companies'); setCompanies(Array.isArray(data) ? data : []); }
    catch (err: any) { setError(err?.message ?? 'Unable to load companies.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadCompanies(); }, []);

  async function loadBusinessUnits(companyId: string) {
    const data = await apiFetch(`/companies/${companyId}/business-units`);
    setBusinessUnits((s) => ({ ...s, [companyId]: Array.isArray(data) ? data : [] }));
  }
  async function loadPlants(businessUnitId: string) {
    const data = await apiFetch(`/companies/business-units/${businessUnitId}/plants`);
    setPlants((s) => ({ ...s, [businessUnitId]: Array.isArray(data) ? data : [] }));
  }
  async function loadLocations(plantId: string) {
    const data = await apiFetch(`/companies/plants/${plantId}/locations`);
    setLocations((s) => ({ ...s, [plantId]: Array.isArray(data) ? data : [] }));
  }
  async function loadDepartments(locationId: string) {
    const data = await apiFetch(`/companies/locations/${locationId}/departments`);
    setDepartments((s) => ({ ...s, [locationId]: Array.isArray(data) ? data : [] }));
  }

  async function toggleCompany(company: Company) {
    const key = `company:${company.id}`;
    if (expanded[key]) { setExpanded((s) => ({ ...s, [key]: false })); return; }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (businessUnits[company.id]) return;
    setLoadingNode(key); try { await loadBusinessUnits(company.id); } catch (err: any) { setError(err?.message ?? 'Unable to load business units.'); setExpanded((s) => ({ ...s, [key]: false })); } finally { setLoadingNode(null); }
  }
  async function toggleBusinessUnit(bu: BusinessUnit) {
    const key = `bu:${bu.id}`;
    if (expanded[key]) { setExpanded((s) => ({ ...s, [key]: false })); return; }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (plants[bu.id]) return;
    setLoadingNode(key); try { await loadPlants(bu.id); } catch (err: any) { setError(err?.message ?? 'Unable to load plants.'); setExpanded((s) => ({ ...s, [key]: false })); } finally { setLoadingNode(null); }
  }
  async function togglePlant(plant: Plant) {
    const key = `plant:${plant.id}`;
    if (expanded[key]) { setExpanded((s) => ({ ...s, [key]: false })); return; }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (locations[plant.id]) return;
    setLoadingNode(key); try { await loadLocations(plant.id); } catch (err: any) { setError(err?.message ?? 'Unable to load locations.'); setExpanded((s) => ({ ...s, [key]: false })); } finally { setLoadingNode(null); }
  }
  async function toggleLocation(location: Location) {
    const key = `location:${location.id}`;
    if (expanded[key]) { setExpanded((s) => ({ ...s, [key]: false })); return; }
    setExpanded((s) => ({ ...s, [key]: true }));
    if (departments[location.id]) return;
    setLoadingNode(key); try { await loadDepartments(location.id); } catch (err: any) { setError(err?.message ?? 'Unable to load departments.'); setExpanded((s) => ({ ...s, [key]: false })); } finally { setLoadingNode(null); }
  }

  function openCreate(type: NodeType, parentId?: string) { setModal({ mode: 'create', type, parentId, name: '', code: '' }); setError(null); }
  function openEdit(type: NodeType, node: Node) { setModal({ mode: 'edit', type, id: node.id, name: node.name, code: node.code ?? '' }); setError(null); }
  function closeModal() { if (!saving) setModal(null); }

  async function submitModal(event: React.FormEvent) {
    event.preventDefault(); if (!modal) return;
    setSaving(true); setError(null);
    try {
      const body = modal.type === 'company' ? { name: modal.name.trim(), code: modal.code.trim().toUpperCase() } : { name: modal.name.trim() };
      if (modal.mode === 'edit') {
        const url = modal.type === 'company' ? `/companies/${modal.id}` : `/companies/${modal.type === 'businessUnit' ? 'business-units' : modal.type === 'plant' ? 'plants' : modal.type === 'location' ? 'locations' : 'departments'}/${modal.id}`;
        await apiFetch(url, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        const url = modal.type === 'company' ? '/companies' : modal.type === 'businessUnit' ? `/companies/${modal.parentId}/business-units` : modal.type === 'plant' ? `/companies/business-units/${modal.parentId}/plants` : modal.type === 'location' ? `/companies/plants/${modal.parentId}/locations` : `/companies/locations/${modal.parentId}/departments`;
        await apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
      }
      const createdType = modal.type; const parentId = modal.parentId; setModal(null);
      if (createdType === 'company') await loadCompanies();
      else if (createdType === 'businessUnit' && parentId) await loadBusinessUnits(parentId);
      else if (createdType === 'plant' && parentId) await loadPlants(parentId);
      else if (createdType === 'location' && parentId) await loadLocations(parentId);
      else if (createdType === 'department' && parentId) await loadDepartments(parentId);
    } catch (err: any) { setError(err?.message ?? `Unable to ${modal.mode} ${labels[modal.type].toLowerCase()}.`); }
    finally { setSaving(false); }
  }

  async function remove(type: NodeType, node: Node, parentId?: string) {
    if (!window.confirm(`Delete ${labels[type].toLowerCase()} “${node.name}”? It will be blocked when dependent records exist.`)) return;
    setError(null);
    try {
      const url = type === 'company' ? `/companies/${node.id}` : `/companies/${type === 'businessUnit' ? 'business-units' : type === 'plant' ? 'plants' : type === 'location' ? 'locations' : 'departments'}/${node.id}`;
      await apiFetch(url, { method: 'DELETE' });
      if (type === 'company') await loadCompanies();
      else if (type === 'businessUnit' && parentId) await loadBusinessUnits(parentId);
      else if (type === 'plant' && parentId) await loadPlants(parentId);
      else if (type === 'location' && parentId) await loadLocations(parentId);
      else if (type === 'department' && parentId) await loadDepartments(parentId);
    } catch (err: any) { setError(err?.message ?? `Unable to delete ${labels[type].toLowerCase()}.`); }
  }

  const visibleCompanies = useMemo(() => companies.filter((company) => `${company.name} ${company.code ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [companies, query]);

  const actionButtons = (type: NodeType, node: Node, parentId?: string) => <div className="ml-auto flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100"><button onClick={(e) => { e.stopPropagation(); openEdit(type, node); }} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label={`Edit ${labels[type]}`}><Edit3 size={14}/></button><button onClick={(e) => { e.stopPropagation(); void remove(type, node, parentId); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Delete ${labels[type]}`}><Trash2 size={14}/></button></div>;

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Organization</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Companies & structure</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Create, edit and delete your company hierarchy: company, business unit, plant, location and department.</p></div><div className="flex gap-2"><button onClick={() => void loadCompanies()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button><button onClick={() => openCreate('company')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16}/>Add company</button></div></div>
    {error&&<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search companies" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></div><span className="text-xs text-slate-500">{visibleCompanies.length} of {companies.length} companies</span></div>
    {loading?<div className="space-y-3 p-5">{[1,2,3].map(n=><div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100"/>)}</div>:visibleCompanies.length===0?<div className="p-14 text-center"><Building2 size={38} className="mx-auto text-slate-300"/><p className="mt-4 font-semibold text-slate-800">No companies found</p><p className="mt-1 text-sm text-slate-500">Add your first company above.</p></div>:<div className="divide-y divide-slate-100">
      {visibleCompanies.map(company=>{const key=`company:${company.id}`;return <div key={company.id} className="group"><div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"><button onClick={()=>void toggleCompany(company)} className="flex min-w-0 flex-1 items-center gap-3 text-left">{expanded[key]?<ChevronDown size={17}/>:<ChevronRight size={17}/>}<div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Building2 size={17}/></div><div className="min-w-0"><div className="font-semibold text-slate-900">{company.name}</div><div className="text-xs text-slate-500">{company.code??'No code'}</div></div></button>{actionButtons('company',company)}<button onClick={()=>openCreate('businessUnit',company.id)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Add business unit"><Plus size={15}/></button>{loadingNode===key&&<Loader2 size={16} className="animate-spin text-slate-400"/>}</div>
      {expanded[key]&&<div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2">{(businessUnits[company.id]??[]).length===0?<p className="px-9 py-3 text-sm text-slate-500">No business units.</p>:(businessUnits[company.id]??[]).map(bu=>{const bkey=`bu:${bu.id}`;return <div key={bu.id} className="group"><div className="flex items-center gap-2"><button onClick={()=>void toggleBusinessUnit(bu)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-9 py-3 text-left hover:bg-white">{expanded[bkey]?<ChevronDown size={15}/>:<ChevronRight size={15}/>}<div className="flex-1"><div className="text-sm font-semibold text-slate-800">{bu.name}</div><div className="text-xs text-slate-400">Business unit</div></div></button>{actionButtons('businessUnit',bu,company.id)}<button onClick={()=>openCreate('plant',bu.id)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Add plant"><Plus size={14}/></button></div>
      {expanded[bkey]&&<div className="ml-12 border-l border-slate-200 pl-3">{(plants[bu.id]??[]).length===0?<p className="px-3 py-2 text-xs text-slate-500">No plants.</p>:(plants[bu.id]??[]).map(plant=>{const pkey=`plant:${plant.id}`;return <div key={plant.id} className="group"><div className="flex items-center gap-2"><button onClick={()=>void togglePlant(plant)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white">{expanded[pkey]?<ChevronDown size={14}/>:<ChevronRight size={14}/>}<div className="flex-1 text-sm font-medium text-slate-700">{plant.name}</div></button>{actionButtons('plant',plant,bu.id)}<button onClick={()=>openCreate('location',plant.id)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Add location"><Plus size={13}/></button></div>
      {expanded[pkey]&&<div className="ml-5 border-l border-slate-200 pl-3">{(locations[plant.id]??[]).length===0?<p className="px-3 py-2 text-xs text-slate-500">No locations.</p>:(locations[plant.id]??[]).map(location=>{const lkey=`location:${location.id}`;return <div key={location.id} className="group"><div className="flex items-center gap-2"><button onClick={()=>void toggleLocation(location)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white">{expanded[lkey]?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<div className="flex-1 text-sm text-slate-700">{location.name}</div></button>{actionButtons('location',location,plant.id)}<button onClick={()=>openCreate('department',location.id)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Add department"><Plus size={12}/></button></div>
      {expanded[lkey]&&<div className="ml-5 border-l border-slate-200 pl-3">{(departments[location.id]??[]).length===0?<p className="px-3 py-2 text-xs text-slate-500">No departments.</p>:(departments[location.id]??[]).map(department=><div key={department.id} className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white"><div className="h-1.5 w-1.5 rounded-full bg-slate-300"/><div className="flex-1 text-sm text-slate-600">{department.name}</div>{actionButtons('department',department,location.id)}</div>)}</div>}</div>;})}</div>}</div>;})}</div>}</div>;})}</div>}
      </div>;})}
    </div>}
    </section>

    {modal&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={e=>{if(e.currentTarget===e.target)closeModal()}}><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-600">{modal.mode==='create'?'Create':'Edit'}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{labels[modal.type]}</h2></div><button onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18}/></button></div><form onSubmit={submitModal} className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Name<input required autoFocus value={modal.name} onChange={e=>setModal(s=>s?{...s,name:e.target.value}:s)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></label>{modal.type==='company'&&<label className="block text-sm font-semibold text-slate-700">Code<input required minLength={2} value={modal.code} onChange={e=>setModal(s=>s?{...s,code:e.target.value.toUpperCase()}:s)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></label>}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving?'Saving…':modal.mode==='create'?'Create':'Save changes'}</button></div></form></div></div>}
  </div>;
}
