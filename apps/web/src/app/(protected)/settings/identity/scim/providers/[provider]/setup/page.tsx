'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../../../../../../components/ui';

const guides: Record<
  string,
  { name: string; steps: string[]; fields: string[]; note: string }
> = {
  entra_id: {
    name: 'Microsoft Entra ID',
    steps: [
      'Open Enterprise applications and select the AssetHub application.',
      'Enable Provisioning and choose Automatic provisioning.',
      'Enter the AssetHub SCIM endpoint and secret.',
      'Set provisioning scope to the users AssetHub should manage, then test provisioning.',
    ],
    fields: ['Tenant / directory', 'SCIM endpoint', 'Secret token', 'Provisioning scope'],
    note: 'Keep Entra groups out of AssetHub unless group-based provisioning is explicitly introduced.',
  },
  okta: {
    name: 'Okta',
    steps: [
      'Open Applications and select the AssetHub integration.',
      'Open Provisioning and enable SCIM.',
      'Enter the AssetHub SCIM endpoint and API token.',
      'Configure create, update, and deactivate actions according to the lifecycle policy.',
    ],
    fields: ['Okta org', 'SCIM endpoint', 'API token', 'Provisioning actions'],
    note: 'Okta groups remain provider-side; AssetHub membership and RBAC stay independent.',
  },
  jumpcloud: {
    name: 'JumpCloud',
    steps: [
      'Open the AssetHub application in JumpCloud Admin Portal.',
      'Enable SCIM provisioning.',
      'Enter the AssetHub SCIM endpoint and bearer token.',
      'Assign only the users that should synchronize and test lifecycle events.',
    ],
    fields: ['JumpCloud directory', 'SCIM endpoint', 'Bearer token', 'Assigned users'],
    note: 'Do not map JumpCloud groups into AssetHub roles automatically.',
  },
  custom_scim: {
    name: 'Custom SCIM',
    steps: [
      'Configure your provider for SCIM 2.0 over HTTPS.',
      'Use the AssetHub SCIM endpoint and bearer token.',
      'Send stable user identifiers matching the selected AssetHub key.',
      'Test create, update, disable, duplicate, and re-enable events before production.',
    ],
    fields: ['SCIM base URL', 'Bearer token', 'Matching attribute', 'Lifecycle actions'],
    note: 'The provider must support stable resource IDs and active=false deprovisioning semantics.',
  },
};

export default function ProviderSetup() {
  const { provider } = useParams<{ provider: string }>();
  const g = guides[provider] ?? guides.custom_scim;
  const [copied, setCopied] = useState(false);
  const endpoint = 'Configured in the provider connection screen';

  async function copy() {
    await navigator.clipboard?.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 page-section-enter">
      <Link
        href={`/settings/identity/scim/providers/${provider}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"
      >
        <ArrowLeft size={15} />
        Back to {g.name}
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">
          Provider setup
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Connect {g.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Follow these steps on the identity provider, then test the connection in AssetHub.
        </p>
      </header>

      <section className="panel p-6">
        <h2 className="font-semibold text-slate-950">Setup steps</h2>
        <ol className="mt-4 space-y-4">
          {g.steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--theme-primary-soft)] text-sm font-bold text-[var(--theme-primary)]">
                {index + 1}
              </span>
              <span className="pt-1 text-sm leading-6 text-slate-600">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-950">Required values</h2>
          <div className="mt-3 space-y-2">
            {g.fields.map((field) => (
              <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {field}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-950">AssetHub endpoint</h2>
          <div className="mt-3 flex gap-2">
            <div className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {endpoint}
            </div>
            <Button variant="secondary" onClick={() => void copy()}>
              <Copy size={15} />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            The real endpoint is exposed after provider connection setup.
          </p>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 size={19} className="mt-0.5 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Recommended test sequence</p>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            Create → update → disable → verify assets/history remain → re-enable → verify access follows SSO/RBAC policy.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--theme-primary)]/15 bg-[var(--theme-primary-soft)] p-5">
        <ShieldCheck size={19} className="mt-0.5 text-[var(--theme-primary)]" />
        <div>
          <p className="font-semibold text-slate-900">Security boundary</p>
          <p className="mt-1 text-sm text-slate-600">{g.note}</p>
        </div>
      </div>

      <Link
        href={`/settings/identity/scim/providers/${provider}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"
      >
        Open provider configuration <ExternalLink size={15} />
      </Link>
    </div>
  );
}
