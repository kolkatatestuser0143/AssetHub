'use client';
import { useEffect, useState } from 'react';
import { Power, RefreshCw, Search } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type Tenant = {
 id:string; name:string; slug:string; status:'active'|'suspended'|'archived';
 subscriptionStatus:string; planId?:string|null; endsAt?:string|null;
 suspendedAt?:string|null; suspensionReason?:string|null;
};

export default function SystemTenantsPage(){
 const [items,setItems]=useState<Tenant[]>([]); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{setItems(await systemFetch('/system/tenants'));}catch(e:any){setError(e.message??'Unable to load tenants.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 const filtered=items.filter(t=>`${t.name} ${t.slug} ${t.status}`.toLowerCase().includes(q.toLowerCase()));
 async function toggle(t:Tenant){
  try{
   if(t.status==='active'){
    const reason=window.prompt('Suspension reason (optional):','Suspended by platform administrator') ?? '';
    await systemFetch(`/system/tenants/${t.id}/suspend`,{method:'PATCH',body:JSON.stringify({reason})});
   } else {
    await systemFetch(`/system/tenants/${t.id}/activate`,{method:'PATCH'});
   }
   await load();
  }catch(e:any){setError(e.message??'Unable to update tenant.')}
 }
 return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Platform</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Tenants</h2><p className="mt-2 text-sm text-slate-500">Manage customer environments and their lifecycle state.</p></header>{error&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tenants" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw className="h-4 w-4"/>Refresh</button></div>{loading?<div className="p-6 text-sm text-slate-500">Loading tenants…</div>:filtered.length===0?<div className="p-12 text-center text-sm text-slate-500">No tenants found.</div>:<div className="divide-y divide-slate-100">{filtered.map(t=><div key={t.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-slate-950">{t.name}</p><p className="mt-1 text-xs text-slate-500">{t.slug} · {t.id}</p>{t.suspensionReason&&<p className="mt-1 text-xs text-amber-700">Reason: {t.suspensionReason}</p>}</div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.status==='active'?'bg-emerald-50 text-emerald-700':t.status==='suspended'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}>{t.status}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">License: {t.subscriptionStatus}</span>{t.status!=='archived'&&<button onClick={()=>void toggle(t)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><Power className="h-3.5 w-3.5"/>{t.status==='active'?'Suspend':'Activate'}</button>}</div></div>)}</div>}</section></div>;
}
