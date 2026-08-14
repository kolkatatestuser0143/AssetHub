'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, FileKey2, Plus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Company = { id: string; name: string; code: string };
type Provider = { id: string; companyId: string; protocol: 'OIDC' | 'SAML'; name: string; isEnabled: boolean; configKeys: string[]; attributeMapping: Record<string, string>; createdAt?: string };
type ScimToken = { id: string; label?: string | null; deprovisionPolicy: string; revokedAt?: string | null; createdAt?: string; active: boolean };
type ScimLog = { id: string; operation: string; externalId?: string; success: boolean; errorMessage?: string; occurredAt?: string };

export default function IdentityPage() {
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
    apiFetch('/companies')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCompanies(list);
        if (!companyId && list.length) setCompanyId(list[0].id);
      })
      .catch((err) => setError(err.message ?? 'Unable to load companies.'));
  }, []);

  async function loadCompanyData(id = companyId) {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [providerData, tokenData, logData] = await Promise.all([
        apiFetch(`/identity-admin/${id}/providers`),
        apiFetch(`/identity-admin/${id}/scim/tokens`),
        apiFetch(`/identity-admin/${id}/scim/logs?limit=100`),
      ]);
      setProviders(Array.isArray(providerData) ? providerData : []);
      setTokens(Array.isArray(tokenData) ? tokenData : []);
      setLogs(Array.isArray(logData) ? logData : []);
    } catch (err: any) {
      setError(err.message ?? 'Unable to load identity administration data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (companyId) void loadCompanyData(companyId); }, [companyId]);

  async function saveProvider(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null); setError(null);
    try {
      JSON.parse(config); JSON.parse(mapping);
      await apiFetch(`/identity-providers/${companyId}`, {
        method: 'POST',
        body: JSON.stringify({ name, protocol, config: JSON.parse(config), attributeMapping: JSON.parse(mapping) }),
      });
      setMessage('Identity provider created successfully.');
      setName(''); setConfig('{}'); setMapping('{}');
      await loadCompanyData();
    } catch (err: any) {
      setError(err instanceof SyntaxError ? 'Provider configuration and mapping must contain valid JSON.' : err.message);
    } finally { setBusy(false); }
  }

  async function toggleProvider(provider: Provider) {
    setError(null); setMessage(null);
    try {
      await apiFetch(`/identity-admin/${companyId}/providers/${provider.id}/${provider.isEnabled ? 'disable' : 'enable'}`, { method: 'PATCH' });
      setMessage(`${provider.name} ${provider.isEnabled ? 'disabled' : 'enabled'}.`);
      await loadCompanyData();
    } catch (err: any) { setError(err.message ?? 'Unable to update provider.'); }
  }

  async function createToken(event: React.FormEvent) {
    event.preventDefault();
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
    } catch (err: any) { setError(err.message ?? 'Unable to create SCIM token.'); }
    finally { setBusy(false); }
  }

  async function revokeToken(token: ScimToken) {
    setError(null); setMessage(null);
    try {
      await apiFetch(`/identity-admin/${companyId}/scim/tokens/${token.id}/revoke`, { method: 'PATCH' });
      setMessage('SCIM token revoked.');
      await loadCompanyData();
    } catch (err: any) { setError(err.message ?? 'Unable to revoke token.'); }
  }

  const selectedCompany = useMemo(() => companies.find((company) => company.id === companyId), [companies, companyId]);
  const activeTokens = tokens.filter((token) => token.active).length;
  const successfulLogs = logs.filter((log) => log.success).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Enterprise identity</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Identity & SSO</h1>
          <p className="mt-2 text-sm text-slate-500">Manage provider trust, SCIM provisioning tokens, and synchronization activity for a tenant company.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500">
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name} ({company.code})</option>)}
          </select>
          <button onClick={() => loadCompanyData()} disabled={loading || !companyId} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={16}/>{message}</div>}

      {revealedToken && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-sm font-semibold text-amber-900">New SCIM token</p><p className="mt-1 text-xs text-amber-800">This is the only time the raw token is displayed.</p><code className="mt-3 block break-all rounded-xl border border-amber-200 bg-white p-3 text-xs text-slate-800">{revealedToken}</code></div>
            <button onClick={() => navigator.clipboard.writeText(revealedToken)} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><Copy size={15}/>Copy token</button>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Providers', providers.length, 'Configured identity providers'],
          ['Enabled providers', providers.filter((provider) => provider.isEnabled).length, 'Currently available for SSO'],
          ['Active SCIM tokens', activeTokens, 'Provisioning credentials'],
          ['Successful sync events', successfulLogs, 'Recent SCIM log entries'],
        ].map(([label, value, hint]) => <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div>)}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Identity providers</h2><p className="mt-1 text-sm text-slate-500">{selectedCompany?.name ?? 'Selected company'} provider configurations.</p></div><div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><ShieldCheck size={14}/>Tenant scoped</div></div>
        <div className="mt-5 space-y-3">
          {providers.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No identity providers configured.</div> : providers.map((provider) => <div key={provider.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{provider.protocol}</span><p className="font-semibold text-slate-900">{provider.name}</p><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${provider.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{provider.isEnabled ? 'Enabled' : 'Disabled'}</span></div><p className="mt-2 text-xs text-slate-500">Config keys: {provider.configKeys.length ? provider.configKeys.join(', ') : 'none'} · {Object.keys(provider.attributeMapping ?? {}).length} attribute mappings</p></div><button onClick={() => toggleProvider(provider)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{provider.isEnabled ? <XCircle size={14}/> : <CheckCircle2 size={14}/>} {provider.isEnabled ? 'Disable' : 'Enable'}</button></div>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><Plus size={18}/></span><div><h2 className="font-semibold text-slate-950">Add identity provider</h2><p className="text-sm text-slate-500">Create OIDC or SAML trust configuration.</p></div></div>
          <form onSubmit={saveProvider} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Provider name<input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Corporate SSO" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/></label><label className="text-sm font-medium text-slate-700">Protocol<select value={protocol} onChange={(e)=>setProtocol(e.target.value as 'OIDC'|'SAML')} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="OIDC">OIDC</option><option value="SAML">SAML</option></select></label></div>
            <label className="text-sm font-medium text-slate-700">Provider config JSON<textarea value={config} onChange={(e)=>setConfig(e.target.value)} rows={7} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-blue-500"/></label>
            <label className="text-sm font-medium text-slate-700">Attribute mapping JSON<textarea value={mapping} onChange={(e)=>setMapping(e.target.value)} rows={6} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-blue-500"/></label>
            <button disabled={busy || !companyId} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Create provider'}</button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">SCIM tokens</h2><p className="mt-1 text-sm text-slate-500">Use these credentials for directory provisioning.</p></div><span className="text-xs font-semibold text-slate-400">{tokens.length} total</span></div>
            <form onSubmit={createToken} className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]"><input value={tokenLabel} onChange={(e)=>setTokenLabel(e.target.value)} placeholder="Token label" className="h-10 rounded-xl border border-slate-200 px-3 text-sm"/><select value={policy} onChange={(e)=>setPolicy(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="DISABLE_LOGIN">Disable login</option><option value="SOFT_DELETE">Soft delete</option><option value="NO_ACTION">No action</option></select><button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15}/>Create token</button></form>
            <div className="mt-5 space-y-2">{tokens.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No SCIM tokens.</div> : tokens.map((token) => <div key={token.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900">{token.label || 'Unlabelled token'}</p><p className="mt-1 text-xs text-slate-500">{token.deprovisionPolicy} · {token.active ? 'Active' : `Revoked ${token.revokedAt ? new Date(token.revokedAt).toLocaleString() : ''}`}</p></div>{token.active && <button onClick={() => revokeToken(token)} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50">Revoke</button>}</div>)}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div><h2 className="font-semibold text-slate-950">SCIM synchronization history</h2><p className="mt-1 text-sm text-slate-500">Latest provisioning operations for this company.</p></div>
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Operation</th><th className="px-3 py-3">External ID</th><th className="px-3 py-3">Result</th><th className="px-3 py-3">Message</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No SCIM synchronization events.</td></tr> : logs.map((log) => <tr key={log.id}><td className="px-3 py-3 text-xs text-slate-500">{log.occurredAt ? new Date(log.occurredAt).toLocaleString() : '—'}</td><td className="px-3 py-3 font-semibold text-slate-800">{log.operation}</td><td className="px-3 py-3 font-mono text-xs text-slate-500">{log.externalId || '—'}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${log.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{log.success ? 'Success' : 'Failed'}</span></td><td className="max-w-[260px] truncate px-3 py-3 text-xs text-slate-500" title={log.errorMessage || ''}>{log.errorMessage || '—'}</td></tr>)}</tbody></table></div>
          </div>
        </section>
      </div>
    </div>
  );
}
