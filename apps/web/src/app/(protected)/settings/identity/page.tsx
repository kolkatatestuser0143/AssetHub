'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronRight, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import { Badge, Button, LoadingState } from '../../../../components/ui';

type Provider = { id: string; name: string; type?: string; enabled?: boolean; status?: string; supportsSso?: boolean; supportsScim?: boolean };

const providers = [
  { key: 'entra', name: 'Microsoft Entra ID', description: 'Enterprise SSO and directory provisioning.', logo: 'Entra', sso: true, scim: true },
  { key: 'jumpcloud', name: 'JumpCloud', description: 'Directory-backed SSO and lifecycle provisioning.', logo: 'JC', sso: true, scim: true },
  { key: 'okta', name: 'Okta', description: 'Enterprise identity, SSO and provisioning.', logo: 'Okta', sso: true, scim: true },
  { key: 'saml', name: 'Generic SAML 2.0', description: 'Connect a SAML-compatible identity provider.', logo: 'SAML', sso: true, scim: false },
  { key: 'oidc', name: 'Generic OIDC', description: 'Connect an OpenID Connect identity provider.', logo: 'OIDC', sso: true, scim: false },
  { key: 'ldap', name: 'LDAP / LDAPS', description: 'Connect a directory service for managed authentication.', logo: 'LDAP', sso: false, scim: false },
];

export default function IdentitySettingsPage() {
  const [configured, setConfigured] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await apiFetch('/identity/providers');
      setConfigured(Array.isArray(data) ? data : data?.providers ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Identity provider status is unavailable.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function sync() {
    setSyncing(true);
    try { await apiFetch('/identity/sync', { method: 'POST' }); await load(); }
    catch (err: any) { setError(err?.message ?? 'Identity sync could not be started.'); }
    finally { setSyncing(false); }
  }

  const connected = configured.length;

  return <div className="mx-auto max-w-6xl space-y-6 page-section-enter">
    <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15}/>Back to settings</Link>
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Organization security</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Identity & SSO</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Connect your identity provider for SSO and directory provisioning. Employee records remain managed by AssetHub while provider identity data can be synchronized and reconciled.</p></div>
      <Button variant="secondary" onClick={() => void sync()} loading={syncing}><RefreshCw size={15}/>Sync status</Button>
    </header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-3"><Stat icon={<ShieldCheck size={18}/>} label="Connected providers" value={String(connected)}/><Stat icon={<KeyRound size={18}/>} label="SSO" value={configured.filter((p) => p.supportsSso !== false).length ? 'Available' : 'Not configured'}/><Stat icon={<RefreshCw size={18}/>} label="Provisioning" value={configured.some((p) => p.supportsScim) ? 'SCIM enabled' : 'Not configured'}/></section>
    <section><div className="mb-4"><h2 className="text-lg font-semibold text-slate-950">Identity providers</h2><p className="mt-1 text-sm text-slate-500">Choose a provider to configure or manage its connection.</p></div>{loading ? <div className="panel p-8"><LoadingState label="Loading identity providers…"/></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{providers.map((provider) => { const existing = configured.find((item) => item.id === provider.key || item.name?.toLowerCase() === provider.name.toLowerCase()); return <Link key={provider.key} href={`/settings/identity/${provider.key}`} className="ui-interactive group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[var(--theme-primary)]/30 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-sm font-bold text-[var(--theme-primary)]">{provider.logo}</div>{existing?.enabled ? <Badge tone="success">Connected</Badge> : <Badge tone="neutral">Not connected</Badge>}</div><h3 className="mt-4 font-semibold text-slate-950">{provider.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{provider.description}</p><div className="mt-4 flex flex-wrap gap-2">{provider.sso && <Badge tone="neutral">SSO</Badge>}{provider.scim && <Badge tone="neutral">SCIM</Badge>}</div><div className="mt-5 flex items-center justify-between text-sm font-semibold text-[var(--theme-link)]"><span>{existing ? 'Manage provider' : 'Configure provider'}</span><ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5"/></div></Link>; })}</div>}</section>
  </div>;
}

function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[var(--theme-primary)]">{icon}<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span></div><p className="mt-2 text-xl font-bold text-slate-950">{value}</p></div>; }
