'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import { useAuth } from '../../../../lib/auth-context';

type AssetType={id:string;name:string;prefix?:string};
type Vendor={id:string;name:string};

type FormState={assetTypeId:string;serialNumber:string;model:string;vendorId:string;condition:string};
const CONDITIONS=['GOOD','FAIR','DAMAGED','NEEDS_INSPECTION'];

export default function NewAssetPage(){
 const router=useRouter(); const {tenantProfile}=useAuth();
 const [types,setTypes]=useState<AssetType[]>([]); const [vendors,setVendors]=useState<Vendor[]>([]); const [form,setForm]=useState<FormState>({assetTypeId:'',serialNumber:'',model:'',vendorId:'',condition:'GOOD'});
 const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{void load()},[]);
 async function load(){setLoading(true);setError(null);try{const [typeData,vendorData]=await Promise.all([apiFetch('/assets/types'),apiFetch('/assets/vendors')]);const nextTypes=Array.isArray(typeData)?typeData:[];setTypes(nextTypes);setVendors(Array.isArray(vendorData)?vendorData:[]);setForm(v=>({...v,assetTypeId:v.assetTypeId||nextTypes[0]?.id||''}));}catch(e:any){setError(e?.message||'Unable to load asset entry data.')}finally{setLoading(false)}}
 function set<K extends keyof FormState>(key:K,value:FormState[K]){setForm(v=>({...v,[key]:value}))}
 async function submit(e:React.FormEvent){e.preventDefault();if(!form.assetTypeId){setError('Asset type is required.');return}setSaving(true);setError(null);try{await apiFetch('/assets',{method:'POST',body:JSON.stringify({assetTypeId:form.assetTypeId,serialNumber:form.serialNumber.trim()||undefined,model:form.model.trim()||undefined,vendorId:form.vendorId||undefined,condition:form.condition})});router.push('/assets')}catch(e:any){setError(e?.message||'Unable to create asset.')}finally{setSaving(false)}}
 const companyName=tenantProfile?.name||'Tenant account';
 return <div className="mx-auto max-w-4xl space-y-6"><div className="flex items-center gap-3"><Link href="/assets" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ArrowLeft size={18}/></Link><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Inventory</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">New asset</h1><p className="mt-1 text-sm text-slate-500">Create an asset record for {companyName}.</p></div></div>
 {error&&<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
 <form onSubmit={submit} className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Asset information</h2><p className="mt-1 text-sm text-slate-500">Enter the information you know now. Optional fields can be completed later.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium text-slate-700">Asset type <span className="text-red-500">*</span></span><select required disabled={loading} value={form.assetTypeId} onChange={e=>set('assetTypeId',e.target.value)} className="field h-11 w-full"><option value="">Select asset type</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}{t.prefix?` · ${t.prefix}`:''}</option>)}</select></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Serial number</span><input value={form.serialNumber} onChange={e=>set('serialNumber',e.target.value)} placeholder="e.g. ABC123456" className="field h-11 w-full"/></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Model</span><input value={form.model} onChange={e=>set('model',e.target.value)} placeholder="e.g. Latitude 5440" className="field h-11 w-full"/></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Vendor</span><select value={form.vendorId} onChange={e=>set('vendorId',e.target.value)} className="field h-11 w-full"><option value="">Select vendor</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Condition</span><select value={form.condition} onChange={e=>set('condition',e.target.value)} className="field h-11 w-full">{CONDITIONS.map(c=><option key={c} value={c}>{c.replaceAll('_',' ')}</option>)}</select></label></div></section>
 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Asset number</h2><p className="mt-1 text-sm text-slate-500">AssetHub generates the asset number automatically from the selected asset type and company code.</p><div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Generated automatically when you save the asset.</div></section>
 <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/assets" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link><button disabled={saving||loading||!form.assetTypeId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"><Save size={16}/>{saving?'Creating…':'Create asset'}</button></div></form></div>;
}
