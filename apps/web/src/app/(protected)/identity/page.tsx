'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, FileKey2, Plus, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Company = { id: string; name: string; code: string };

export default function IdentityPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<'OIDC' | 'SAML'>('OIDC');
  const [config, setConfig] = useState('{}');
  const [mapping, setMapping] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/companies').then((data) => setCompanies(Array.isArray(data) ? data : [])).catch((err) => setError(err.message));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null); setError(null);
    try {
      await apiFetch(`/identity-providers/${companyId}`, {
        method: 'POST',
        body: JSON.stringify({ name, protocol, config: JSON.parse(config), attributeMapping: JSON.parse(mapping) }),
      });
      setMessage('Identity provider configuration created successfully.');
      setName(''); setConfig('{}'); setMapping('{}');
    } catch (err: any) {
      setError(err instanceof SyntaxError ? 'Provider configuration must contain valid JSON.' : err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Enterprise identity</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Identity & SSO</h1><p className="mt-1 text-sm text-slate-500">Configure provider trust and attribute mapping for tenant companies.</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ShieldCheck size={15}/>Secure configuration</div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[['OIDC','OpenID Connect'],['SAML','SAML 2.0'],['SCIM','Provisioning']].map(([k,v]) => <div key={k} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileKey2 size={18}/></span><span className="text-xs font-semibold text-slate-400">{k}</span></div><p className="mt-4 font-semibold text-slate-900">{v}</p><p className="mt-1 text-xs text-slate-500">{k === 'SCIM' ? 'Provisioning APIs are exposed separately.' : 'Provider creation is available through the API.'}</p></div>)}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><Plus size={18}/></span><div><h2 className="font-semibold text-slate-950">Add identity provider</h2><p className="text-sm text-slate-500">Create a tenant-company provider record.</p></div></div>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Company<select required value={companyId} onChange={(e)=>setCompanyId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Select company</option>{companies.map((c)=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Provider name<input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Corporate SSO" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></label>
          </div>
          <label className="text-sm font-medium text-slate-700">Protocol<select value={protocol} onChange={(e)=>setProtocol(e.target.value as 'OIDC'|'SAML')} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="OIDC">OIDC</option><option value="SAML">SAML</option></select></label>
          <div className="grid gap-4 lg:grid-cols-2"><label className="text-sm font-medium text-slate-700">Provider config JSON<textarea value={config} onChange={(e)=>setConfig(e.target.value)} rows={10} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-blue-500"/></label><label className="text-sm font-medium text-slate-700">Attribute mapping JSON<textarea value={mapping} onChange={(e)=>setMapping(e.target.value)} rows={10} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-blue-500"/></label></div>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={16}/>{message}</div>}
          <button disabled={busy || !companyId} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Saving…' : 'Create provider'}</button>
        </form>
      </section>
    </div>
  );
}
