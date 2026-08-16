'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { systemFetch } from '../../../../../lib/system-api';

type Tenant={name:string;primaryEmail?:string|null};

export default function PrimaryLoginEmailPage(){
 const params=useParams<{tenantId:string}>(); const tenantId=params.tenantId;
 const [tenant,setTenant]=useState<Tenant|null>(null); const [email,setEmail]=useState(''); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState('');
 useEffect(()=>{if(!tenantId)return;void (async()=>{try{const data=await systemFetch(`/system/tenants/${tenantId}`);setTenant(data.tenant);setEmail(data.tenant?.primaryEmail??'')}catch(e:any){setError(e?.message??'Unable to load tenant.')}finally{setLoading(false)}})()},[tenantId]);
 async function save(){if(!email.trim())return;setBusy(true);setError('');setSuccess('');try{await systemFetch(`/system/tenants/${tenantId}/primary-login-email`,{method:'PATCH',body:JSON.stringify({email:email.trim()})});setSuccess('Primary login email changed. All existing tenant sessions were revoked.');}catch(e:any){setError(e?.message??'Unable to change primary login email.')}finally{setBusy(false)}}
 if(loading)return <div className="h-48 animate-pulse rounded-2xl bg-slate-100"/>;
 return <div className="mx-auto max-w-2xl space-y-6"><Link href={`/system/tenants/${tenantId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"><ArrowLeft size={16}/>Back to tenant</Link><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">System Administration</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Change primary login email</h1><p className="mt-2 text-sm text-slate-500">{tenant?.name??'Tenant'} — this operation changes the actual tenant login identity.</p></header>{error&&<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{success&&<div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"><ShieldCheck className="mt-0.5 text-slate-700" size={20}/><div><p className="font-semibold text-slate-900">System Admin only</p><p className="mt-1 text-xs leading-5 text-slate-500">Tenants cannot change this address from their company profile. Changing it updates both the tenant record and the primary login user, then revokes active sessions.</p></div></div><label className="mt-6 block text-sm font-semibold text-slate-700">Primary login email<div className="relative mt-2"><Mail className="absolute left-3 top-3 text-slate-400" size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="field h-11 w-full pl-10" placeholder="admin@company.com"/></div></label><div className="mt-6 flex justify-end"><button disabled={busy||!email.trim()} onClick={()=>void save()} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Changing…':'Change login email'}</button></div></section></div>;
}
