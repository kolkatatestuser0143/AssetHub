'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

function CreateChild({ label, action, placeholder }: { label: string; action: (name: string) => Promise<void>; placeholder: string }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <form onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; setBusy(true); setMessage(''); try { await action(name.trim()); setName(''); setMessage(`${label} created.`); } catch (err: any) { setMessage(err.message ?? `Unable to create ${label.toLowerCase()}.`); } finally { setBusy(false); } }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-950">{label}</h3><p className="mt-1 text-xs text-slate-500">Use the parent selector to create a new record.</p></div></div>
    <div className="mt-4 flex gap-3"><input value={name} onChange={e=>setName(e.target.value)} placeholder={placeholder} className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm"/><button disabled={busy} className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy?'Creating…':'Create'}</button></div>
    {message && <p className="mt-3 text-xs text-slate-500">{message}</p>}
  </form>
}

export default function StructurePage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [buId, setBuId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { apiFetch('/companies').then(data => { const rows = Array.isArray(data) ? data : []; setCompanies(rows); if (rows[0]) setCompanyId(rows[0].id); }).catch(e => setError(e.message ?? 'Unable to load companies.')); }, []);

  const company = companies.find(c => c.id === companyId);
  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Organization</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Operational structure</h1><p className="mt-2 text-sm text-slate-500">Create the hierarchy used to place and assign assets without inventing records the API cannot list.</p></div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="text-sm font-semibold text-slate-800">Company</label><select value={companyId} onChange={e=>{setCompanyId(e.target.value);setBuId('');setPlantId('');setLocationId('')}} className="mt-2 h-11 w-full max-w-xl rounded-xl border border-slate-200 px-3 text-sm"><option value="">Select company</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select>{company&&<p className="mt-2 text-xs text-slate-500">Selected company: {company.name}</p>}</section>
    <div className="grid gap-5 md:grid-cols-2">
      <CreateChild label="Business Unit" placeholder="Business unit name" action={async name=>{if(!companyId)throw new Error('Select a company first.');const row=await apiFetch(`/companies/${companyId}/business-units`,{method:'POST',body:JSON.stringify({name})});setBuId(row.id ?? '');}} />
      <CreateChild label="Plant" placeholder="Plant name" action={async name=>{if(!buId)throw new Error('Create/select a business unit first.');const row=await apiFetch(`/companies/business-units/${buId}/plants`,{method:'POST',body:JSON.stringify({name})});setPlantId(row.id ?? '');}} />
      <CreateChild label="Location" placeholder="Location name" action={async name=>{if(!plantId)throw new Error('Create/select a plant first.');const row=await apiFetch(`/companies/plants/${plantId}/locations`,{method:'POST',body:JSON.stringify({name})});setLocationId(row.id ?? '');}} />
      <CreateChild label="Department" placeholder="Department name" action={async name=>{if(!locationId)throw new Error('Create/select a location first.');await apiFetch(`/companies/locations/${locationId}/departments`,{method:'POST',body:JSON.stringify({name})});}} />
    </div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The current API exposes hierarchical creation endpoints but not list endpoints for business units, plants, locations, or departments. This screen therefore keeps the workflow creation-focused and never renders fake hierarchy records.</div>
  </div>;
}
