'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, Plus, CalendarClock, Ban, Play, Pause, Save, Trash2 } from 'lucide-react';
import { systemFetch } from '../../../lib/system-api';

type Tenant = { id: string; name: string; slug?: string; subscriptionStatus?: string; planId?: string | null; endsAt?: string | null };
type Plan = { id: string; name: string; features?: Record<string, unknown> };
type Subscription = { id: string; tenantId: string; planId: string; status: string; startedAt?: string; endsAt?: string | null };

const statuses = ['active', 'trialing', 'past_due', 'canceled'] as const;

export default function SystemSubscriptionsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [endsAt, setEndsAt] = useState('');
  const [entitlementKey, setEntitlementKey] = useState('');
  const [entitlementValue, setEntitlementValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [tenantData, billingData] = await Promise.all([
        systemFetch('/system/tenants'),
        systemFetch('/system/subscriptions'),
      ]);
      const nextTenants = Array.isArray(tenantData) ? tenantData : [];
      const nextPlans = Array.isArray(billingData?.plans) ? billingData.plans : [];
      const nextSubscriptions = Array.isArray(billingData?.subscriptions) ? billingData.subscriptions : [];
      setTenants(nextTenants);
      setPlans(nextPlans);
      setSubscriptions(nextSubscriptions);
      if (!selectedTenantId && nextTenants[0]) setSelectedTenantId(nextTenants[0].id);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load license data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selectedTenant = useMemo(() => tenants.find((t) => t.id === selectedTenantId) ?? null, [tenants, selectedTenantId]);
  const subscription = useMemo(() => subscriptions.find((s) => s.tenantId === selectedTenantId) ?? null, [subscriptions, selectedTenantId]);

  useEffect(() => {
    setPlanId(subscription?.planId ?? '');
    setStatus(subscription?.status ?? 'active');
    setEndsAt(subscription?.endsAt ? new Date(subscription.endsAt).toISOString().slice(0, 10) : '');
    setEntitlementKey('');
    setEntitlementValue('');
  }, [subscription?.id]);

  async function assignOrUpdate() {
    if (!selectedTenantId || !planId) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await systemFetch(`/system/subscriptions/${selectedTenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ planId, status, endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : undefined }),
      });
      setSuccess(subscription ? 'License updated successfully.' : 'License assigned successfully.');
      await load();
    } catch (e: any) { setError(e?.message ?? 'Unable to save license.'); }
    finally { setSaving(false); }
  }

  async function renew() {
    if (!selectedTenantId || !endsAt) return;
    setAction('renew'); setError(''); setSuccess('');
    try {
      await systemFetch(`/system/subscriptions/${selectedTenantId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ endsAt: new Date(`${endsAt}T23:59:59`).toISOString() }),
      });
      setSuccess('License renewed successfully.');
      await load();
    } catch (e: any) { setError(e?.message ?? 'Unable to renew license.'); }
    finally { setAction(''); }
  }

  async function changeStatus(nextStatus: string) {
    if (!selectedTenantId || !subscription) return;
    setAction(nextStatus); setError(''); setSuccess('');
    try {
      await systemFetch(`/system/subscriptions/${selectedTenantId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setSuccess(`License status changed to ${nextStatus}.`);
      await load();
    } catch (e: any) { setError(e?.message ?? 'Unable to change license status.'); }
    finally { setAction(''); }
  }

  async function revoke() {
    if (!selectedTenantId || !subscription) return;
    if (!window.confirm(`Revoke the license for ${selectedTenant?.name ?? 'this tenant'}? This removes the current subscription and its entitlements.`)) return;
    setAction('revoke'); setError(''); setSuccess('');
    try {
      await systemFetch(`/system/subscriptions/${selectedTenantId}`, { method: 'DELETE' });
      setSuccess('License revoked successfully.');
      await load();
    } catch (e: any) { setError(e?.message ?? 'Unable to revoke license.'); }
    finally { setAction(''); }
  }

  async function saveEntitlement() {
    if (!subscription || !entitlementKey.trim()) return;
    setAction('entitlement'); setError(''); setSuccess('');
    let value: unknown = entitlementValue;
    try { value = JSON.parse(entitlementValue); } catch { /* keep as string */ }
    try {
      await systemFetch(`/system/subscriptions/${selectedTenantId}/entitlement/${subscription.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ key: entitlementKey.trim(), value }),
      });
      setSuccess('Entitlement saved.');
      setEntitlementKey(''); setEntitlementValue('');
    } catch (e: any) { setError(e?.message ?? 'Unable to save entitlement.'); }
    finally { setAction(''); }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Platform</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Tenant Licenses</h1>
          <p className="mt-2 text-sm text-slate-500">Assign, edit, renew, suspend, reactivate, and revoke tenant subscriptions.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-60"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600"/><h2 className="font-semibold text-slate-950">Tenants</h2></div>
          <div className="mt-4 space-y-2">
            {loading ? <div className="h-48 animate-pulse rounded-xl bg-slate-100" /> : tenants.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No tenants found.</p> : tenants.map((tenant) => (
              <button key={tenant.id} onClick={() => setSelectedTenantId(tenant.id)} className={`w-full rounded-xl border p-4 text-left transition ${tenant.id === selectedTenantId ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{tenant.name}</p><p className="mt-1 text-xs text-slate-500">{tenant.slug ?? tenant.id}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{tenant.subscriptionStatus ?? 'unlicensed'}</span></div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          {!selectedTenant ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Select a tenant to manage its license.</div> : <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">License management</p><h2 className="mt-1 text-xl font-bold text-slate-950">{selectedTenant.name}</h2><p className="mt-1 text-xs text-slate-500">Tenant ID: {selectedTenant.id}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${subscription?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{subscription?.status ?? 'unlicensed'}</span></div>
              <div className="mt-6 grid gap-4 md:grid-cols-3"><label className="text-sm font-medium text-slate-700">Plan<select value={planId} onChange={(e) => setPlanId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">Select plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Expiry<input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label></div>
              <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void assignOrUpdate()} disabled={!planId || saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? 'Saving…' : subscription ? 'Save changes' : 'Assign license'}</button>{subscription && <><button onClick={() => void renew()} disabled={!endsAt || action !== ''} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-50"><CalendarClock className="h-4 w-4"/>{action === 'renew' ? 'Renewing…' : 'Renew'}</button>{subscription.status === 'active' ? <button onClick={() => void changeStatus('canceled')} disabled={action !== ''} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-50"><Pause className="h-4 w-4"/>Suspend</button> : <button onClick={() => void changeStatus('active')} disabled={action !== ''} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50"><Play className="h-4 w-4"/>Reactivate</button>}<button onClick={() => void revoke()} disabled={action !== ''} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4"/>{action === 'revoke' ? 'Revoking…' : 'Revoke license'}</button></>}</div>
            </div>

            {subscription && <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><Plus className="h-5 w-5 text-blue-600"/><h2 className="font-semibold text-slate-950">Edit entitlement</h2></div><p className="mt-1 text-sm text-slate-500">Store a feature flag or limit override for this subscription. Values can be JSON or plain text.</p><div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.4fr_auto]"><input value={entitlementKey} onChange={(e) => setEntitlementKey(e.target.value)} placeholder="e.g. max_assets" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"/><input value={entitlementValue} onChange={(e) => setEntitlementValue(e.target.value)} placeholder='e.g. 1000 or true or "enterprise"' className="h-11 rounded-xl border border-slate-200 px-3 text-sm"/><button onClick={() => void saveEntitlement()} disabled={!entitlementKey.trim() || action !== ''} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4"/>{action === 'entitlement' ? 'Saving…' : 'Save'}</button></div></div>}

            <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Plan</p><p className="mt-2 font-semibold text-slate-950">{plans.find((p) => p.id === subscription?.planId)?.name ?? 'Unlicensed'}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Started</p><p className="mt-2 font-semibold text-slate-950">{subscription?.startedAt ? new Date(subscription.startedAt).toLocaleDateString() : '—'}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Ends</p><p className="mt-2 font-semibold text-slate-950">{subscription?.endsAt ? new Date(subscription.endsAt).toLocaleDateString() : 'No expiry'}</p></div></div>
          </>}
        </section>
      </div>
    </div>
  );
}
