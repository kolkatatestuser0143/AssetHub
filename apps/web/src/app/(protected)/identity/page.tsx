'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, FileKey2, Plus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

type Company = { id: string; name: string; code: string };
type Provider = { id: string; companyId: string; protocol: 'OIDC' | 'SAML'; name: string; isEnabled: boolean; configKeys: string[]; attributeMapping: Record<string, string> };
type ScimToken = { id: string; label?: string | null; deprovisionPolicy: string; revokedAt?: string | null; createdAt?: string; active: boolean };
type ScimLog = { id: string; operation: string; externalId?: string; success: boolean; errorMessage?: string; occurredAt?: string };

export default function IdentityPage() {
  const { hasFeature, adminLevel } = useAuth();
  const scimEnabled = hasFeature('scim_enabled');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tokens, setTokens] = useState<ScimToken[]>([]);
  const [logs, setLogs] = useState<ScimLog[]>([]);
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<'OIDC' | 'SAML'>('OIDC');
  const [config, setConfig] = useState('{}');
  const [mapping, setMapping] = useState('{}');
  const [tokenLabel, setTokenLabel] = useState('');
  const [policy, setPolicy] = useState('DISABLE_LOGIN');
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch('/companies')
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setCompanies(list);
        if (!companyId && list.length) setCompanyId(list[0].id);
      })
      .catch((err: any) => active && setError(err?.message ?? 'Unable to load companies.'));
    return () => { active = false; };
  }, []);

  async function loadCompanyData(id = companyId) {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const providerData = await apiFetch(`/identity-admin/${id}/providers`);
      setProviders(Array.isArray(providerData) ? providerData : []);

      if (scimEnabled) {
        const [tokenData, logData] = await Promise.all([
          apiFetch(`/identity-admin/${id}/scim/tokens`),
          apiFetch(`/identity-admin/${id}/scim/logs?limit=100`),
        ]);
        setTokens(Array.isArray(tokenData) ? tokenData : []);
        setLogs(Array.isArray(logData) ? logData : []);
      } else {
        setTokens([]);
        setLogs([]);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load identity administration data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (companyId) void loadCompanyData(companyId); }, [companyId, scimEnabled]);

  async function saveProvider(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null); setError(null);
    try {
      const parsedConfig = JSON.parse(config);
      const parsedMapping = JSON.parse(mapping);
      await apiFetch(`/identity-providers/${companyId}`, {
        method: 'POST',
        body: JSON.stringify({ name, protocol, config: parsedConfig, attributeMapping: parsedMapping }),
      });
      setMessage('Identity provider created successfully.');
      setName(''); setConfig('{}'); setMapping('{}');
      await loadCompanyData();
    } catch (err: any) {
      setError(err instanceof SyntaxError ? 'Provider configuration and mapping must contain valid JSON.' : err?.message ?? 'Unable to create identity provider.');
    } finally { setBusy(false); }
  }

  async function toggleProvider(provider: Provider) {
    setError(null); setMessage(null);
    try {
      await apiFetch(`/identity-admin/${companyId}/providers/${provider.id}/${provider.isEnabled ? 'disable' : 'enable'}`, { method: 'PATCH' });
      setMessage(`${provider.name} ${provider.isEnabled ? 'disabled' : 'enabled'}.`);
      await loadCompanyData();
    } catch (err: any) { setError(err?.message ?? 'Unable to update provider.'); }
  }

  async function createToken(event: React.FormEvent) {
    event.preventDefault();
    if (!scimEnabled) return;
    setBusy(true); setMessage(null); setError(null); setRevealedToken(null);
    try {
      const result = await apiFetch(`/identity-admin/${companyId}/scim/tokens`, {
        method: 'POST',
        body: JSON.stringify({ label: tokenLabel || undefined, deprovisionPolicy: policy }),
      });
      setRevealedToken(result.token);
      setTokenLabel('');
      setMessage('SCIM token created. Copy it now; it will not be shown again.');
      await loadCompanyData();
    } catch (err: any) { setError(err?.message ?? 'Unable to create SCIM token.'); }
    finally { setBusy(false); }
  }

  async function revokeToken(token: ScimToken) {
    if (!scimEnabled) return;
    setError(null); setMessage(null);
    try {
      await apiFetch(`/identity-admin/${companyId}/scim/tokens/${token.id}/revoke`, { method: 'PATCH' });
      setMessage('SCIM token revoked.');
      await loadCompanyData();
    } catch (err: any) { setError(err?.message ?? 'Unable to revoke SCIM token.'); }
  }

  const selectedCompany = useMemo(() => companies.find((company) => company.id === companyId), [companies, companyId]);
  const activeTokens = tokens.filter((token) => token.active).length;
  const successfulLogs = logs.filter((log) => log.success).length;

  if (adminLevel === 'EMPLOYEE') {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-[var(--theme-link)]" size={34} />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Identity administration isn’t available for your access level</h1>
          <p className="mt-2 text-sm text-slate-500">Contact your Tenant Administrator if you need SSO or provisioning access.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Enterprise identity</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Identity &amp; SSO</h1>
          <p className="mt-2 text-sm text-slate-500">Manage provider trust and, where your plan allows, SCIM provisioning for a tenant company.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-[var(--theme-link)]">
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name} ({company.code})</option>)}
          </select>
          <button onClick={() => void loadCompanyData()} disabled={loading || !companyId} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={16} />{message}</div>}

      {!scimEnabled && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><FileKey2 className="mt-0.5 text-amber-700" size={18} /><div><p className="font-semibold text-amber-900">SCIM provisioning is not included in the current plan</p><p className="mt-1 text-sm text-amber-800">SSO provider management remains available. Contact your administrator to enable a plan with SCIM provisioning.</p></div></div></section>}

      {revealedToken && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-semibold text-amber-900">New SCIM token</p><p className="mt-1 text-xs text-amber-800">This is the only time the raw token is displayed.</p><code className="mt-3 block break-all rounded-xl border border-amber-200 bg-white p-3 text-xs text-slate-800">{revealedToken}</code></div><button onClick={() => navigator.clipboard.writeText(revealedToken)} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><Copy size={15} />Copy token</button></div></section>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Providers', providers.length, 'Configured identity providers'],
          ['Enabled providers', providers.filter((p) => p.isEnabled).length, 'Currently available for SSO'],
          ['Active SCIM tokens', scimEnabled ? activeTokens : '—', scimEnabled ? 'Provisioning credentials' : 'Not included in current plan'],
          ['Successful sync events', scimEnabled ? successfulLogs : '—', scimEnabled ? 'Recent SCIM log entries' : 'Not included in current plan'],
        ].map(([label, value, hint]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div>)}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Identity providers</h2><p className="mt-1 text-sm text-slate-500">{selectedCompany?.name ?? 'Selected company'} provider configurations.</p></div><div className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-link)]"><ShieldCheck size={14} />Tenant scoped</div></div>
        <div className="mt-5 space-y-3">
          {providers.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No identity providers configured.</div> : providers.map((provider) => <div key={provider.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{provider.protocol}</span><p className="font-semibold text-slate-900">{provider.name}</p><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${provider.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{provider.isEnabled ? 'Enabled' : 'Disabled'}</span></div><p className="mt-2 text-xs text-slate-500">Config keys: {provider.configKeys.length ? provider.configKeys.join(', ') : 'none'} · {Object.keys(provider.attributeMapping ?? {}).length} attribute mappings</p></div><button onClick={() => void toggleProvider(provider)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{provider.isEnabled ? <XCircle size={14} /> : <CheckCircle2 size={14} />} {provider.isEnabled ? 'Disable' : 'Enable'}</button></div>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--theme-primary)] text-white"><Plus size={18} /></span><div><h2 className="font-semibold text-slate-950">Add identity provider</h2><p className="text-sm text-slate-500">Create OIDC or SAML trust configuration.</p></div></div>
          <form onSubmit={saveProvider} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Provider name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Corporate SSO" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--theme-link)]" /></label><label className="text-sm font-medium text-slate-700">Protocol<select value={protocol} onChange={(e) => setProtocol(e.target.value as 'OIDC' | 'SAML')} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="OIDC">OIDC</option><option value="SAML">SAML</option></select></label></div>
            <label className="text-sm font-medium text-slate-700">Provider config JSON<textarea value={config} onChange={(e) => setConfig(e.target.value)} rows={7} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-[var(--theme-link)]" /></label>
            <label className="text-sm font-medium text-slate-700">Attribute mapping JSON<textarea value={mapping} onChange={(e) => setMapping(e.target.value)} rows={6} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-[var(--theme-link)]" /></label>
            <button disabled={busy || !companyId} className="inline-flex items-center justify-center rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Create provider'}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">SCIM provisioning</h2><p className="mt-1 text-sm text-slate-500">Directory provisioning credentials and activity.</p></div><span className="text-xs font-semibold text-slate-400">{scimEnabled ? `${tokens.length} total` : 'Unavailable'}</span></div>
          {!scimEnabled ? <div className="mt-5 rounded-xl border border-dashed border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">SCIM is disabled for the current subscription. No provisioning endpoints are called from this page.</div> : <>
            <form onSubmit={createToken} className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]"><input value={tokenLabel} onChange={(e) => setTokenLabel(e.target.value)} placeholder="Token label" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><select value={policy} onChange={(e) => setPolicy(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="DISABLE_LOGIN">Disable login</option><option value="SOFT_DELETE">Soft delete</option><option value="NO_ACTION">No action</option></select><button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15} />Create token</button></form>
            <div className="mt-5 space-y-2">{tokens.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No SCIM tokens.</div> : tokens.map((token) => <div key={token.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900">{token.label || 'Unlabelled token'}</p><p className="mt-1 text-xs text-slate-500">{token.deprovisionPolicy} · {token.active ? 'Active' : `Revoked ${token.revokedAt ? new Date(token.revokedAt).toLocaleString() : ''}`}</p></div>{token.active && <button type="button" onClick={() => void revokeToken(token)} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50">Revoke</button>}</div>)}</div>
          </>}
        </section>
      </div>

      {scimEnabled && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Recent SCIM activity</h2><p className="mt-1 text-sm text-slate-500">Latest synchronization events for the selected company.</p></div><span className="text-xs text-slate-400">{logs.length} events</span></div><div className="mt-4 space-y-2">{logs.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No SCIM activity recorded.</div> : logs.map((log) => <div key={log.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{log.operation}</p><p className="mt-1 text-xs text-slate-500">{log.externalId || 'No external ID'}{log.occurredAt ? ` · ${new Date(log.occurredAt).toLocaleString()}` : ''}</p>{log.errorMessage && <p className="mt-1 text-xs text-red-700">{log.errorMessage}</p>}</div><span className={`inline-flex w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${log.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{log.success ? 'Success' : 'Failed'}</span></div>)}</div></section>}
    </div>
  );
}
