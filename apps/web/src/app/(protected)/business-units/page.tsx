'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Company = { id: string; name: string; code: string };

export default function BusinessUnitsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/companies').then((data) => setCompanies(Array.isArray(data) ? data : [])).catch((err) => setError(err.message));
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      await apiFetch(`/companies/${companyId}/business-units`, { method: 'POST', body: JSON.stringify({ name }) });
      setName(''); setMessage('Business unit created. The backend currently does not expose a list endpoint, so it cannot yet be shown in this view.');
    } catch (err:any) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Organization</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Business units</h1><p className="mt-1 text-sm text-slate-500">Create business units beneath a tenant company.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 size={18}/></span><div><h2 className="font-semibold text-slate-950">Create business unit</h2><p className="text-sm text-slate-500">Creation is available through the current tenancy API.</p></div></div><form onSubmit={create} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><select required value={companyId} onChange={(e)=>setCompanyId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select company</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select><input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Business unit name" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/><button disabled={busy || !companyId} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16}/>{busy?'Creating…':'Create'}</button></form>{error&&<div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{message&&<div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}</section>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>List view pending.</strong> The backend currently exposes business-unit creation but not a tenant-scoped list endpoint, so no organizational records are fabricated here.</div>
  </div>;
}
