'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Power, Save, X } from 'lucide-react';
import { systemFetch } from '../../lib/system-api';
import { Button } from '../ui';
import { FormField, FormSelect } from '../form-field';
import { Modal, ModalBody } from '../modal';

type Tenant = { id: string; name: string; status: 'active' | 'suspended' | 'archived'; planId?: string | null; endsAt?: string | null };
type Plan = { id: string; name: string; isActive: boolean };
type Mode = 'create' | 'suspend' | 'renew' | 'plan' | null;

const SAFE_ERROR = 'Something went wrong. Please review the information and try again.';
function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return /exception|stack|trace|nestjs|mongoose|mongodb|500|401|403|404/i.test(message) ? SAFE_ERROR : (message || SAFE_ERROR);
}

export default function SystemModalBridge() {
  const [mode, setMode] = useState<Mode>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', email: '', planId: '', reason: '', endsAt: '' });

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await systemFetch('/system/plans');
        setPlans((Array.isArray(data) ? data : []).filter((plan: Plan) => plan.isActive));
      } catch {
        setPlans([]);
      }
    }
    void loadPlans();
  }, []);

  useEffect(() => {
    function findTenantId(button: Element) {
      const row = button.closest('div.flex')?.closest('div.flex');
      const link = row?.querySelector<HTMLAnchorElement>('a[href^="/system/tenants/"]');
      return link?.getAttribute('href')?.match(/^\/system\/tenants\/([^/]+)/)?.[1] ?? null;
    }

    function onClickCapture(event: MouseEvent) {
      const target = event.target as Element | null;
      const button = target?.closest('button');
      if (!button) return;
      const text = button.textContent?.trim() ?? '';
      const path = window.location.pathname;

      if (path === '/system/tenants' && text === 'Create tenant') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setError('');
        setForm({ name: '', slug: '', email: '', planId: plans[0]?.id ?? '', reason: '', endsAt: '' });
        setMode('create');
        return;
      }

      if (path !== '/system/tenants') return;
      const tenantId = findTenantId(button);
      if (!tenantId) return;

      if (text === 'Suspend') {
        event.preventDefault(); event.stopImmediatePropagation();
        setTenant({ id: tenantId, name: 'Tenant', status: 'active' });
        setForm((current) => ({ ...current, reason: 'Suspended by platform administrator' }));
        setError(''); setMode('suspend');
      } else if (text === 'Renew') {
        event.preventDefault(); event.stopImmediatePropagation();
        setTenant({ id: tenantId, name: 'Tenant', status: 'active' });
        setForm((current) => ({ ...current, endsAt: '' }));
        setError(''); setMode('renew');
      } else if (text === 'Change plan') {
        event.preventDefault(); event.stopImmediatePropagation();
        setTenant({ id: tenantId, name: 'Tenant', status: 'active' });
        setForm((current) => ({ ...current, planId: plans[0]?.id ?? '' }));
        setError(''); setMode('plan');
      }
    }

    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [plans]);

  function close() {
    if (!saving) setMode(null);
  }

  async function submitCreate() {
    if (!form.name.trim() || !form.slug.trim() || !form.email.trim() || !form.planId) {
      setError('Complete all required fields.');
      return;
    }
    setSaving(true); setError('');
    try {
      await systemFetch('/system/tenants', { method: 'POST', body: JSON.stringify({ name: form.name.trim(), slug: form.slug.trim(), email: form.email.trim(), planId: form.planId }) });
      setMode(null);
      window.location.reload();
    } catch (err) {
      setError(friendlyError(err));
    } finally { setSaving(false); }
  }

  async function submitSuspend() {
    if (!tenant) return;
    setSaving(true); setError('');
    try {
      await systemFetch(`/system/tenants/${tenant.id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason: form.reason.trim() }) });
      setMode(null); window.location.reload();
    } catch (err) { setError(friendlyError(err)); } finally { setSaving(false); }
  }

  async function submitRenew() {
    if (!tenant || !form.endsAt) { setError('Select a renewal end date.'); return; }
    setSaving(true); setError('');
    try {
      await systemFetch(`/system/subscriptions/${tenant.id}/renew`, { method: 'POST', body: JSON.stringify({ endsAt: `${form.endsAt}T23:59:59.999Z` }) });
      setMode(null); window.location.reload();
    } catch (err) { setError(friendlyError(err)); } finally { setSaving(false); }
  }

  async function submitPlan() {
    if (!tenant || !form.planId) { setError('Select a subscription plan.'); return; }
    setSaving(true); setError('');
    try {
      await systemFetch(`/system/subscriptions/${tenant.id}`, { method: 'PATCH', body: JSON.stringify({ planId: form.planId, status: 'active' }) });
      setMode(null); window.location.reload();
    } catch (err) { setError(friendlyError(err)); } finally { setSaving(false); }
  }

  const title = mode === 'create' ? 'Create tenant' : mode === 'suspend' ? 'Suspend tenant' : mode === 'renew' ? 'Renew subscription' : 'Change subscription plan';
  const description = mode === 'create' ? 'Provision a new customer environment.' : mode === 'suspend' ? 'Temporarily block tenant access while preserving its data.' : mode === 'renew' ? 'Set the new subscription end date.' : 'Move the tenant to another active subscription plan.';

  return (
    <Modal open={Boolean(mode)} onClose={close} title={title} description={description} variant="modal" size="lg" closeOnBackdrop={!saving}
      footer={<><Button variant="secondary" type="button" disabled={saving} onClick={close}>Cancel</Button><Button type="button" loading={saving} onClick={() => void (mode === 'create' ? submitCreate() : mode === 'suspend' ? submitSuspend() : mode === 'renew' ? submitRenew() : submitPlan())} icon={<Save size={16} />}>{mode === 'create' ? 'Create tenant' : mode === 'suspend' ? 'Suspend tenant' : mode === 'renew' ? 'Renew subscription' : 'Save plan'}</Button></>}
    >
      <ModalBody>
        {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div> : null}
        {mode === 'create' ? <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Main tenant company name" id="system-tenant-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="sm:col-span-2" placeholder="ABC Technologies Pvt Ltd" />
          <FormField label="Tenant slug" id="system-tenant-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} required placeholder="abc-technologies" />
          <FormField label="Tenant login email" id="system-tenant-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required type="email" placeholder="admin@abc.com" />
          <FormSelect label="Subscription plan" id="system-tenant-plan" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} required className="sm:col-span-2"><option value="">Select plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</FormSelect>
        </div> : null}
        {mode === 'suspend' ? <div className="space-y-4"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><div className="flex items-center gap-2 font-semibold"><Power size={16} />Access will be suspended</div><p className="mt-1">Existing tenant data is preserved.</p></div><FormField label="Suspension reason" id="system-suspend-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for suspension (optional)" /></div> : null}
        {mode === 'renew' ? <div className="space-y-4"><CalendarClock className="text-blue-600" size={22} /><FormField label="Renewal end date" id="system-renew-date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} type="date" required /><p className="text-xs text-slate-500">The renewal takes effect immediately after saving.</p></div> : null}
        {mode === 'plan' ? <div className="space-y-4"><FormSelect label="Subscription plan" id="system-change-plan" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} required><option value="">Select plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</FormSelect></div> : null}
      </ModalBody>
    </Modal>
  );
}
