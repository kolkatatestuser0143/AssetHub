'use client';

import { useEffect, useState } from 'react';
import { Archive, CheckCircle2, Plus, RefreshCw, Save } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';
import { Button, EmptyState, ErrorState, LoadingState } from '../../../components/ui';
import { FormField, FormTextarea } from '../../../components/form-field';
import { useToast } from '../../../components/toast';

type Plan = { id: string; name: string; features?: Record<string, unknown>; isActive: boolean; createdAt?: string; updatedAt?: string };

const DEFAULT_FEATURES: Record<string, unknown> = {
  max_assets: 1000, max_users: 25, max_companies: 3, max_business_units: 10, max_plants: 25, max_locations: 25,
  max_departments: 50, max_vendors: 100, max_asset_documents: 500, max_storage_gb: 10, max_asset_document_size_mb: 10,
  max_saved_reports: 25, max_api_keys: 5, max_integrations: 3, max_api_rate_limit_per_minute: 120, session_max_days: 30,
  max_concurrent_sessions: 3, audit_retention_days: 90, sso_enabled: false, scim_enabled: false, mfa_enabled: true,
  audit_enabled: true, advanced_reports_enabled: false, scheduled_reports_enabled: false, asset_documents_enabled: true,
  bulk_import_enabled: true, api_access_enabled: false, webhooks_enabled: false, custom_roles_enabled: false,
  custom_fields_enabled: false, approval_workflows_enabled: false,
};

export default function SystemPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState(''); const [name, setName] = useState('');
  const [featuresText, setFeaturesText] = useState(JSON.stringify(DEFAULT_FEATURES, null, 2));
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function load(selectFirst = false) {
    setLoading(true); setError('');
    try { const data = await systemFetch('/system/plans'); const next = Array.isArray(data) ? data : []; setPlans(next); if (selectFirst && next[0]) selectPlan(next[0]); }
    catch (e: any) { setError(e?.message ?? 'Unable to load plans.'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(true); }, []);
  function selectPlan(plan: Plan) { setCreating(false); setSelectedId(plan.id); setName(plan.name); setFeaturesText(JSON.stringify(plan.features ?? {}, null, 2)); setError(''); }
  function startCreate() { setCreating(true); setSelectedId(''); setName(''); setFeaturesText(JSON.stringify(DEFAULT_FEATURES, null, 2)); setError(''); }
  async function save() {
    if (!name.trim()) { setError('Plan name is required.'); return; }
    setSaving(true); setError('');
    try {
      const features = JSON.parse(featuresText);
      if (!features || typeof features !== 'object' || Array.isArray(features)) throw new Error('Features must be a JSON object.');
      if (creating) { const created = await systemFetch('/system/plans', { method: 'POST', body: JSON.stringify({ name: name.trim(), features }) }); toast({ title: 'Plan created', message: name.trim(), tone: 'success' }); await load(); if (created?.id) { const refreshed = await systemFetch('/system/plans'); const found = Array.isArray(refreshed) ? refreshed.find((item: Plan) => item.id === created.id) : null; if (found) selectPlan(found); } }
      else { await systemFetch(`/system/plans/${selectedId}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim(), features }) }); toast({ title: 'Plan updated', message: name.trim(), tone: 'success' }); await load(); }
      setCreating(false);
    } catch (e: any) { setError(e?.message ?? 'Unable to save plan.'); toast({ title: 'Plan save failed', message: e?.message ?? 'Unable to save plan.', tone: 'error' }); }
    finally { setSaving(false); }
  }
  async function toggleActive(plan: Plan) {
    setSaving(true); setError('');
    try { await systemFetch(`/system/plans/${plan.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !plan.isActive }) }); toast({ title: plan.isActive ? 'Plan archived' : 'Plan reactivated', message: plan.name, tone: 'success' }); await load(); }
    catch (e: any) { setError(e?.message ?? 'Unable to change plan status.'); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingState label="Loading platform plans…" rows={7} />;
  if (error && plans.length === 0) return <ErrorState title="Unable to load platform plans" message={error} onRetry={() => void load()} />;

  return <div className="mx-auto max-w-[1400px] space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Platform Billing</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Plans</h1><p className="mt-2 text-sm text-slate-500">Define reusable license tiers, limits, and feature entitlements.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void load()} loading={loading} icon={<RefreshCw size={15}/>}>Refresh</Button><Button onClick={startCreate} icon={<Plus size={16}/>}>New plan</Button></div></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <section className="panel p-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950">Plans</h2><span className="text-xs text-slate-500">{plans.length}</span></div><div className="mt-4 space-y-2">{plans.length === 0 ? <EmptyState title="No plans configured" text="Create the first platform license tier." action="New plan" onAction={startCreate}/> : plans.map(plan => <button type="button" key={plan.id} onClick={() => selectPlan(plan)} className={`w-full rounded-xl border p-4 text-left ui-interactive ${selectedId === plan.id ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{plan.name}</p><p className="mt-1 text-xs text-slate-500">{Object.keys(plan.features ?? {}).length} entitlements</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{plan.isActive ? 'Active' : 'Archived'}</span></div></button>)}</div></section>
      <section className="panel p-6">{!creating && !selectedId ? <EmptyState title="Select a plan" text="Choose a plan or create a new platform license tier." action="New plan" onAction={startCreate}/> : <><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{creating ? 'Create plan' : 'Edit plan'}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{creating ? 'New license tier' : name}</h2></div>{!creating && selectedId && <Button variant="secondary" onClick={() => { const plan = plans.find(item => item.id === selectedId); if (plan) void toggleActive(plan); }} loading={saving} icon={plans.find(item => item.id === selectedId)?.isActive ? <Archive size={15}/> : <CheckCircle2 size={15}/>} >{plans.find(item => item.id === selectedId)?.isActive ? 'Archive' : 'Reactivate'}</Button>}</div><div className="mt-6 space-y-5"><FormField label="Plan name" id="system-plan-name" value={name} onChange={e => setName(e.target.value)} placeholder="Professional" required/><FormTextarea label="Features and limits (JSON)" id="system-plan-features" hint="Technical configuration · JSON object" value={featuresText} onChange={e => setFeaturesText(e.target.value)} className="min-h-[430px] font-mono text-xs leading-6" required spellCheck={false}/></div><div className="mt-5 flex justify-end"><Button loading={saving} disabled={!name.trim() || !selectedId && !creating} onClick={() => void save()} icon={<Save size={15}/>} >{creating ? 'Create plan' : 'Save changes'}</Button></div></>}</section>
    </div>
  </div>;
}
