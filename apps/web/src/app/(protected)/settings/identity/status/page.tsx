'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, ArrowLeft, Power, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../../lib/api-client';
import { Badge, Button, LoadingState } from '../../../../../components/ui';

type Status = {
  provider?: string;
  enabled?: boolean;
  ssoEnabled?: boolean;
  scimEnabled?: boolean;
  health?: 'healthy' | 'degraded' | 'error';
  lastSync?: string;
  lastLogin?: string;
};

export default function IdentityStatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/identity/status');
      setStatus(data?.status ?? data ?? null);
    } catch (err: any) {
      setError(err?.message ?? 'Identity status is unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(field: 'enabled' | 'ssoEnabled' | 'scimEnabled', value: boolean) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/identity/status', {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      });
      setMessage(
        `${field === 'ssoEnabled' ? 'SSO' : field === 'scimEnabled' ? 'SCIM provisioning' : 'Provider'} ${value ? 'enabled' : 'disabled'}.`,
      );
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to update identity settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 page-section-enter">
      <Link
        href="/settings/identity"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"
      >
        <ArrowLeft size={15} />
        Back to Identity & SSO
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">
            Connection health
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">SSO & Provisioning status</h1>
          <p className="mt-2 text-sm text-slate-500">
            Control authentication and provisioning independently. Disabling SSO does not delete employee records.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()} loading={loading}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="panel p-8">
          <LoadingState label="Checking identity connection…" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <HealthCard
              label="Connection health"
              value={status?.health ?? 'unknown'}
              healthy={status?.health === 'healthy'}
              icon={<Activity size={18} />}
            />
            <HealthCard
              label="Configured provider"
              value={status?.provider ?? 'Not configured'}
              healthy={Boolean(status?.provider)}
              icon={<ShieldCheck size={18} />}
            />
          </section>

          <section className="panel divide-y divide-slate-100 overflow-hidden">
            <ToggleRow
              title="Provider connection"
              description="Master switch for this identity-provider connection."
              enabled={Boolean(status?.enabled)}
              busy={busy}
              onChange={(value) => void toggle('enabled', value)}
            />
            <ToggleRow
              title="SSO login"
              description="Allow eligible AssetHub users to authenticate through the configured provider."
              enabled={Boolean(status?.ssoEnabled)}
              busy={busy}
              onChange={(value) => void toggle('ssoEnabled', value)}
            />
            <ToggleRow
              title="SCIM provisioning"
              description="Allow directory lifecycle changes to synchronize into AssetHub."
              enabled={Boolean(status?.scimEnabled)}
              busy={busy}
              onChange={(value) => void toggle('scimEnabled', value)}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Info label="Last directory sync" value={status?.lastSync ?? 'No sync recorded'} />
            <Info label="Last SSO login" value={status?.lastLogin ?? 'No login recorded'} />
          </section>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <AlertTriangle size={19} className="mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">Emergency access</p>
              <p className="mt-1 text-sm text-amber-800">
                Keep at least one AssetHub-local tenant administrator available before disabling SSO. SSO changes do not remove local admin accounts.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  busy,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onChange(!enabled)}
        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
          enabled
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        <Power size={14} />
        {enabled ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
}

function HealthCard({
  label,
  value,
  healthy,
  icon,
}: {
  label: string;
  value: string;
  healthy: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <p className="text-xl font-bold capitalize text-slate-950">{value}</p>
        <Badge tone={healthy ? 'success' : 'warning'}>{healthy ? 'Healthy' : 'Check'}</Badge>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
