'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Save, Shield } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

type Location = { id: string; name: string };
type Site = { id: string; name: string; locations?: Location[] };
type Company = { id: string; name: string; sites?: Site[] };
type Scope = { id?: string; scopeType: 'TENANT' | 'COMPANY' | 'LOCATION'; companyId?: string | null; locationId?: string | null };

export default function RoleScopeEditor({ roleId, initialScopes, onSaved }: { roleId: string; initialScopes: Scope[]; onSaved?: () => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [scopeType, setScopeType] = useState<Scope['scopeType']>(initialScopes.some((s) => s.scopeType === 'TENANT') ? 'TENANT' : initialScopes.some((s) => s.scopeType === 'LOCATION') ? 'LOCATION' : 'COMPANY');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(initialScopes.filter((s) => s.scopeType === 'COMPANY' && s.companyId).map((s) => String(s.companyId)));
  const [selectedLocations, setSelectedLocations] = useState<string[]>(initialScopes.filter((s) => s.scopeType === 'LOCATION' && s.locationId).map((s) => String(s.locationId)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch('/companies/hierarchy').then((data) => setCompanies(Array.isArray(data) ? data : [])).catch((err: any) => setError(err?.message ?? 'Unable to load organization scope.'));
  }, []);

  const locations = useMemo(() => companies.flatMap((company) => (company.sites ?? []).flatMap((site) => (site.locations ?? []).map((location) => ({ ...location, companyId: company.id, company: company.name, site: site.name })))), [companies]);

  function toggle(values: string[], value: string, setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const scopes: Scope[] = scopeType === 'TENANT'
        ? [{ scopeType: 'TENANT' }]
        : scopeType === 'COMPANY'
          ? selectedCompanies.map((companyId) => ({ scopeType: 'COMPANY', companyId }))
          : selectedLocations.map((locationId) => ({ scopeType: 'LOCATION', locationId }));
      if (!scopes.length) throw new Error(`Select at least one ${scopeType === 'LOCATION' ? 'location' : 'company'}.`);
      await apiFetch(`/roles/${roleId}/scopes`, { method: 'PUT', body: JSON.stringify({ scopes }) });
      onSaved?.();
    } catch (err: any) { setError(err?.message ?? 'Unable to save role scope.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2"><Shield size={15} className="text-[var(--theme-link)]" /><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Administrative scope</p></div>
      <p className="mt-1 text-xs text-slate-500">Role permissions apply only inside these organization boundaries. Identity providers cannot grant these scopes.</p>
      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {(['TENANT', 'COMPANY', 'LOCATION'] as const).map((type) => <button key={type} type="button" onClick={() => setScopeType(type)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${scopeType === type ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{type === 'TENANT' ? 'Entire tenant' : type === 'COMPANY' ? 'Companies' : 'Locations'}</button>)}
      </div>
      {scopeType === 'COMPANY' && <div className="mt-3 grid gap-2 sm:grid-cols-2">{companies.map((company) => <label key={company.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"><input type="checkbox" checked={selectedCompanies.includes(company.id)} onChange={() => toggle(selectedCompanies, company.id, setSelectedCompanies)} />{company.name}</label>)}</div>}
      {scopeType === 'LOCATION' && <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">{locations.map((location) => <label key={location.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"><input type="checkbox" checked={selectedLocations.includes(location.id)} onChange={() => toggle(selectedLocations, location.id, setSelectedLocations)} /><MapPin size={13} className="text-slate-400" />{location.name}<span className="ml-auto text-xs text-slate-400">{location.company}</span></label>)}</div>}
      <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save size={14} />{saving ? 'Saving…' : 'Save scope'}</button></div>
    </div>
  );
}
