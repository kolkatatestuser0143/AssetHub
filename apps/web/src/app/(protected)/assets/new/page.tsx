'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import { useAuth } from '../../../../lib/auth-context';

type SiteType = 'plant' | 'branch_office' | 'head_office' | 'other';
type AssetType = { id: string; name: string; prefix?: string };
type Vendor = { id: string; name: string };
type Department = { id: string; name: string };
type Location = { id: string; name: string; departments: Department[] };
type Site = { id: string; name: string; type?: SiteType; locations: Location[] };
type CompanyHierarchy = { id: string; name: string; code: string; sites: Site[] };
type FormState = { companyId: string; assetTypeId: string; serialNumber: string; model: string; vendorId: string; condition: string; siteId: string; locationId: string; departmentId: string };

const CONDITIONS = ['GOOD', 'FAIR', 'DAMAGED', 'NEEDS_INSPECTION'];
const SITE_LABEL: Record<SiteType, string> = { plant: 'Plant', branch_office: 'Branch Office', head_office: 'Head Office', other: 'Other' };

export default function NewAssetPage() {
  const router = useRouter();
  const { tenantProfile } = useAuth();
  const [types, setTypes] = useState<AssetType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [hierarchy, setHierarchy] = useState<CompanyHierarchy[]>([]);
  const [form, setForm] = useState<FormState>({ companyId: '', assetTypeId: '', serialNumber: '', model: '', vendorId: '', condition: 'GOOD', siteId: '', locationId: '', departmentId: '' });
  const [showOrganization, setShowOrganization] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void loadInitial(); }, []);

  async function loadInitial() {
    setLoading(true); setError(null);
    try {
      const hierarchyData = await apiFetch('/companies/hierarchy');
      const nextHierarchy = Array.isArray(hierarchyData) ? hierarchyData as CompanyHierarchy[] : [];
      setHierarchy(nextHierarchy);
      const currentCompanyId = tenantProfile?.company?.id;
      const initialCompanyId = (currentCompanyId && nextHierarchy.some((company) => company.id === currentCompanyId)) ? currentCompanyId : nextHierarchy[0]?.id ?? '';
      setForm((v) => ({ ...v, companyId: initialCompanyId }));
      if (initialCompanyId) await loadCompanyData(initialCompanyId);
    } catch (e: any) { setError(e?.message || 'Unable to load asset entry data.'); }
    finally { setLoading(false); }
  }

  async function loadCompanyData(companyId: string) {
    if (!companyId) { setTypes([]); setVendors([]); return; }
    setLoadingCompanyData(true); setError(null);
    try {
      const [typeData, vendorData] = await Promise.all([
        apiFetch(`/assets/types?companyId=${encodeURIComponent(companyId)}`),
        apiFetch(`/assets/vendors?companyId=${encodeURIComponent(companyId)}`),
      ]);
      const nextTypes = Array.isArray(typeData) ? typeData : [];
      setTypes(nextTypes); setVendors(Array.isArray(vendorData) ? vendorData : []);
      setForm((v) => ({ ...v, assetTypeId: nextTypes.some((x: AssetType) => x.id === v.assetTypeId) ? v.assetTypeId : (nextTypes[0]?.id || ''), vendorId: '' }));
    } catch (e: any) { setError(e?.message || 'Unable to load company asset settings.'); setTypes([]); setVendors([]); }
    finally { setLoadingCompanyData(false); }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((v) => ({ ...v, [key]: value })); }
  const selectedCompany = useMemo(() => hierarchy.find((c) => c.id === form.companyId), [hierarchy, form.companyId]);
  const selectedSite = selectedCompany?.sites?.find((x) => x.id === form.siteId);
  const selectedLocation = selectedSite?.locations?.find((x) => x.id === form.locationId);

  function changeCompany(companyId: string) {
    setForm((v) => ({ ...v, companyId, assetTypeId: '', vendorId: '', siteId: '', locationId: '', departmentId: '' }));
    void loadCompanyData(companyId);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId) { setError('Company is required.'); return; }
    if (!form.assetTypeId) { setError('Asset type is required.'); return; }
    setSaving(true); setError(null);
    try {
      await apiFetch('/assets', { method: 'POST', body: JSON.stringify({ assetTypeId: form.assetTypeId, companyId: form.companyId, locationId: form.locationId || undefined, departmentId: form.departmentId || undefined, vendorId: form.vendorId || undefined, condition: form.condition, serialNumber: form.serialNumber.trim() || undefined, model: form.model.trim() || undefined }) });
      router.push('/assets');
    } catch (e: any) { setError(e?.message || 'Unable to create asset.'); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-4xl space-y-6"><div className="flex items-center gap-3"><Link href="/assets" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ArrowLeft size={18}/></Link><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Inventory</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">New asset</h1><p className="mt-1 text-sm text-slate-500">Create an asset record. Site, location and department are optional.</p></div></div>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={submit} className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Asset information</h2><p className="mt-1 text-sm text-slate-500">All fields except asset type are optional.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium text-slate-700">Asset type <span className="text-red-500">*</span></span><select required disabled={loading || loadingCompanyData || !form.companyId} value={form.assetTypeId} onChange={(e) => set('assetTypeId', e.target.value)} className="field h-11 w-full"><option value="">{loadingCompanyData ? 'Loading asset types…' : 'Select asset type'}</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.prefix ? ` · ${t.prefix}` : ''}</option>)}</select></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Serial number</span><input value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} placeholder="e.g. ABC123456" className="field h-11 w-full"/></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Model</span><input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g. Latitude 5440" className="field h-11 w-full"/></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Vendor</span><select value={form.vendorId} disabled={!form.companyId || loadingCompanyData} onChange={(e) => set('vendorId', e.target.value)} className="field h-11 w-full"><option value="">Select vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Condition</span><select value={form.condition} onChange={(e) => set('condition', e.target.value)} className="field h-11 w-full">{CONDITIONS.map((c) => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}</select></label></div></section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => setShowOrganization((v) => !v)} className="flex w-full items-center justify-between px-6 py-5 text-left"><div><h2 className="font-semibold text-slate-950">Organization <span className="font-normal text-slate-400">(optional)</span></h2><p className="mt-1 text-sm text-slate-500">Choose the company, then optionally assign a site, location or department.</p></div><ChevronDown size={18} className={showOrganization ? 'rotate-180' : ''}/></button>{showOrganization && <div className="border-t border-slate-100 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium text-slate-700">Company</span><select value={form.companyId} onChange={(e) => changeCompany(e.target.value)} className="field h-11 w-full"><option value="">Select company</option>{hierarchy.map((company) => <option key={company.id} value={company.id}>{company.name} ({company.code})</option>)}</select>{hierarchy.length === 1 && <span className="text-xs text-slate-400">Selected automatically because this tenant has one company.</span>}</label><label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium text-slate-700">Site</span><select value={form.siteId} disabled={!selectedCompany} onChange={(e) => { set('siteId', e.target.value); set('locationId', ''); set('departmentId', ''); }} className="field h-11 w-full"><option value="">Not assigned</option>{selectedCompany?.sites?.map((x) => <option key={x.id} value={x.id}>{x.name} · {SITE_LABEL[x.type ?? 'other']}</option>)}</select></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Location</span><select value={form.locationId} disabled={!selectedSite} onChange={(e) => { set('locationId', e.target.value); set('departmentId', ''); }} className="field h-11 w-full"><option value="">Not assigned</option>{selectedSite?.locations?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Department</span><select value={form.departmentId} disabled={!selectedLocation} onChange={(e) => set('departmentId', e.target.value)} className="field h-11 w-full"><option value="">Not assigned</option>{selectedLocation?.departments?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div></div>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Asset number</h2><p className="mt-1 text-sm text-slate-500">AssetHub generates the asset number automatically. A configured type prefix is used when present.</p><div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Generated automatically when you save the asset.</div></section>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/assets" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link><button disabled={saving || loading || loadingCompanyData || !form.companyId || !form.assetTypeId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 text-sm font-semibold text-white disabled:opacity-60"><Save size={16}/>{saving ? 'Creating…' : 'Create asset'}</button></div>
    </form>
  </div>;
}
