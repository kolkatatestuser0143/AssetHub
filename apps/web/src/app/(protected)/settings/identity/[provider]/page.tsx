'use client';

import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, Copy, ShieldCheck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button, Badge } from '../../../../../components/ui';

const definitions: Record<string, { name: string; description: string; protocol: string }> = {
  entra: { name: 'Microsoft Entra ID', description: 'Enterprise SSO and directory provisioning.', protocol: 'OIDC / SAML' },
  jumpcloud: { name: 'JumpCloud', description: 'Directory-backed SSO and lifecycle provisioning.', protocol: 'SAML / SCIM' },
  okta: { name: 'Okta', description: 'Enterprise identity, SSO and provisioning.', protocol: 'OIDC / SAML' },
  saml: { name: 'Generic SAML 2.0', description: 'Connect any SAML-compatible identity provider.', protocol: 'SAML 2.0' },
  oidc: { name: 'Generic OIDC', description: 'Connect any OpenID Connect identity provider.', protocol: 'OIDC' },
  ldap: { name: 'LDAP / LDAPS', description: 'Connect a directory service for managed authentication.', protocol: 'LDAP' },
};

export default function ProviderSetupPage() {
  const { provider } = useParams<{ provider: string }>();
  const definition = useMemo(() => definitions[provider] ?? definitions.saml, [provider]);
  const [step, setStep] = useState(1);
  const [tested, setTested] = useState(false);
  const [enabled, setEnabled] = useState(false);

  return <div className="mx-auto max-w-5xl space-y-6 page-section-enter">
    <Link href="/settings/identity" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-link)]"><ArrowLeft size={15}/>Back to Identity & SSO</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--theme-primary-soft)] text-sm font-bold text-[var(--theme-primary)]">{provider === 'entra' ? 'Entra' : provider === 'jumpcloud' ? 'JC' : provider.toUpperCase()}</div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-slate-950">{definition.name}</h1>{enabled && <Badge tone="success">Enabled</Badge>}</div><p className="mt-1 text-sm text-slate-500">{definition.description}</p></div></div></header>
    <nav className="grid grid-cols-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{['Provider','Connection','Mapping','Test'].map((label, index) => { const n=index+1; return <button key={label} type="button" onClick={() => n <= step && setStep(n)} className={`border-r border-slate-100 px-3 py-4 text-left last:border-0 ${n===step?'bg-[var(--theme-primary-soft)]':''}`}><span className="text-xs font-bold text-slate-400">0{n}</span><span className={`mt-1 block text-sm font-semibold ${n===step?'text-[var(--theme-link)]':'text-slate-700'}`}>{label}</span></button>; })}</nav>
    <section className="panel p-6">
      {step === 1 && <Step title="Choose connection protocol" description="Start with SSO configuration. Provisioning is enabled separately after the connection is verified."><div className="grid gap-3 sm:grid-cols-2">{[definition.protocol, definition.protocol.includes('SAML') ? 'SAML 2.0' : 'OIDC'].filter((v,i,a)=>a.indexOf(v)===i).map((protocol) => <button type="button" key={protocol} onClick={() => setStep(2)} className="rounded-xl border border-slate-200 p-4 text-left hover:border-[var(--theme-primary)]/40"><div className="flex items-center justify-between"><span className="font-semibold text-slate-900">{protocol}</span><ChevronRight size={16} className="text-slate-400"/></div><p className="mt-1 text-xs text-slate-500">Configure secure single sign-on using {protocol}.</p></button>)}</div></Step>}
      {step === 2 && <Step title="Connection details" description="Enter values supplied by your identity provider. Secrets are never shown after they are saved."><div className="grid gap-5 sm:grid-cols-2"><Field label="Issuer / metadata URL" placeholder="https://identity.example.com/..."/><Field label="Client ID / Entity ID" placeholder="Enter client or entity ID"/><Field label="Client secret" placeholder="Enter secret" secret/><Field label="Redirect / ACS URL" value="https://app.assethub.local/api/auth/callback" readOnly copy/></div><div className="mt-6 flex justify-end"><Button onClick={() => setStep(3)}>Continue</Button></div></Step>}
      {step === 3 && <Step title="Attribute mapping" description="Map provider attributes to AssetHub employee fields. Employee ID is the stable matching key for synchronization."><div className="space-y-3">{[['employeeNumber','Employee ID'],['mail','Email'],['givenName','First name'],['surname','Last name'],['department','Department'],['title','Job title']].map(([source,target])=><div key={source} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="text-sm font-medium text-slate-700">{source}</span><span className="text-xs font-bold text-slate-400">→</span><span className="text-sm font-medium text-slate-900">{target}</span></div>)}</div><div className="mt-6 flex justify-end"><Button onClick={() => setStep(4)}>Continue</Button></div></Step>}
      {step === 4 && <Step title="Test and enable" description="Verify the connection before enabling SSO or provisioning for the tenant."><div className="rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-[var(--theme-link)]" size={20}/><div><p className="font-semibold text-slate-900">Connection test</p><p className="text-sm text-slate-500">No employee records will be changed by this test.</p></div></div>{tested && <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><Check size={16}/>Connection configuration is ready for verification.</div>}<div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setTested(true)}>Test connection</Button><Button disabled={!tested} onClick={() => setEnabled(true)}>Enable provider</Button></div></div>{enabled && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Provider setup is enabled. Review the synchronization preview before provisioning employee records.</div>}</Step>}
    </section>
  </div>;
}

function Step({title,description,children}:{title:string;description:string;children:React.ReactNode}) { return <><div className="mb-6"><h2 className="text-lg font-semibold text-slate-950">{title}</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p></div>{children}</>; }
function Field({label,placeholder,value,readOnly,secret,copy}:{label:string;placeholder?:string;value?:string;readOnly?:boolean;secret?:boolean;copy?:boolean}) { return <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><div className="mt-2 flex rounded-xl border border-slate-200 bg-white"><input type={secret?'password':'text'} defaultValue={value} placeholder={placeholder} readOnly={readOnly} className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-sm outline-none"/>{copy && <button type="button" className="px-3 text-slate-400" onClick={() => value && void navigator.clipboard?.writeText(value)} aria-label="Copy"><Copy size={15}/></button>}</div></label>; }
