'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Button } from '../ui';
import { FormField, FormSelect } from '../form-field';
import { Modal, ModalBody } from '../modal';

type SiteType = 'plant' | 'branch_office' | 'head_office' | 'other';
type AssetType = { id: string; name: string; prefix?: string };
type Vendor = { id: string; name: string };
type Department = { id: string; name: string };
type Location = { id: string; name: string; departments?: Department[] };
type Site = { id: string; name: string; type?: SiteType; locations?: Location[] };
type Company = { id: string; name: string; code?: string; sites?: Site[] };

type FormState = {
  companyId: string;
  assetTypeId: string;
  serialNumber: string;
  model: string;
  vendorId: string;
  condition: string;
  siteId: string;
  locationId: string;
  departmentId: string;
};

const CONDITIONS = ['GOOD', 'FAIR', 'DAMAGED', 'NEEDS_INSPECTION'];
const SITE_LABEL: Record<SiteType, string> = {
  plant: 'Plant',
  branch_office: 'Branch Office',
  head_office: 'Head Office',
  other: 'Other',
};
const SAFE_ERROR = 'Something went wrong. Please review the information and try again.';

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (!message) return SAFE_ERROR;
  return /(exception|stack|trace|mongodb|mongoose|nestjs|prisma|500|401|403|404|csrf|validation failed|cannot read|undefined|null)/i.test(message)
    ? SAFE_ERROR
    : message;
}

export default function AssetEditorDrawer({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [hierarchy, setHierarchy] = useState<Company[]>([]);
  const [form, setForm] = useState<FormState>({
    companyId: '',
    assetTypeId: '',
    serialNumber: '',
    model: '',
    vendorId: '',
    condition: 'GOOD',
    siteId: '',
    locationId: '',
    departmentId: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setError(null);
    setSaving(false);
    setLoading(true);
    apiFetch('/companies/hierarchy')
      .then((data) => {
        if (!active) return;
        const companies = Array.isArray(data) ? data as Company[] : [];
        setHierarchy(companies);
        const companyId = companies[0]?.id ?? '';
        setForm((current) => ({ ...current, companyId }));
        if (companyId) void loadCompanyData(companyId);
      })
      .catch((err) => active && setError(friendlyError(err)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open]);

  async function loadCompanyData(companyId: string) {
    if (!companyId) {
      setTypes([]);
      setVendors([]);
      return;
    }
    setLoadingCompanyData(true);
    setError(null);
    try {
      const [typeData, vendorData] = await Promise.all([
        apiFetch(`/assets/types?companyId=${encodeURIComponent(companyId)}`),
        apiFetch(`/assets/vendors?companyId=${encodeURIComponent(companyId)}`),
      ]);
      const nextTypes = Array.isArray(typeData) ? typeData as AssetType[] : [];
      setTypes(nextTypes);
      setVendors(Array.isArray(vendorData) ? vendorData as Vendor[] : []);
      setForm((current) => ({
        ...current,
        assetTypeId: nextTypes.some((item) => item.id === current.assetTypeId) ? current.assetTypeId : (nextTypes[0]?.id ?? ''),
        vendorId: '',
      }));
    } catch (err) {
      setTypes([]);
      setVendors([]);
      setError(friendlyError(err));
    } finally {
      setLoadingCompanyData(false);
    }
  }

  const selectedCompany = useMemo(
    () => hierarchy.find((company) => company.id === form.companyId),
    [hierarchy, form.companyId],
  );
  const selectedSite = selectedCompany?.sites?.find((site) => site.id === form.siteId);
  const selectedLocation = selectedSite?.locations?.find((location) => location.id === form.locationId);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeCompany(companyId: string) {
    setForm((current) => ({ ...current, companyId, assetTypeId: '', vendorId: '', siteId: '', locationId: '', departmentId: '' }));
    void loadCompanyData(companyId);
  }

  async function submit() {
    if (!form.companyId) {
      setError('Select a company.');
      return;
    }
    if (!form.assetTypeId) {
      setError('Select an asset type.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/assets', {
        method: 'POST',
        body: JSON.stringify({
          assetTypeId: form.assetTypeId,
          companyId: form.companyId,
          locationId: form.locationId || undefined,
          departmentId: form.departmentId || undefined,
          vendorId: form.vendorId || undefined,
          condition: form.condition,
          serialNumber: form.serialNumber.trim() || undefined,
          model: form.model.trim() || undefined,
        }),
      });
      onClose();
      onSaved?.();
      setForm({ companyId: '', assetTypeId: '', serialNumber: '', model: '', vendorId: '', condition: 'GOOD', siteId: '', locationId: '', departmentId: '' });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Add Asset"
      description="Create an asset record and optionally place it in your organization hierarchy."
      variant="drawer-right"
      size="lg"
      closeOnBackdrop={!saving}
      footer={(
        <>
          <Button variant="secondary" type="button" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="button" loading={saving} disabled={loading || loadingCompanyData || !form.companyId || !form.assetTypeId} onClick={() => void submit()} icon={<Save size={16} />}>Create asset</Button>
        </>
      )}
    >
      <ModalBody>
        {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div> : null}

        <div className="space-y-6">
          <section>
            <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Asset information</p><h3 className="mt-1 text-base font-semibold text-slate-950">Identity & classification</h3></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect label="Company" id="asset-company" value={form.companyId} onChange={(event) => changeCompany(event.target.value)} required>
                <option value="">Select company</option>
                {hierarchy.map((company) => <option key={company.id} value={company.id}>{company.name}{company.code ? ` (${company.code})` : ''}</option>)}
              </FormSelect>
              <FormSelect label="Asset type" id="asset-type" value={form.assetTypeId} onChange={(event) => set('assetTypeId', event.target.value)} disabled={!form.companyId || loadingCompanyData} required>
                <option value="">{loadingCompanyData ? 'Loading asset types…' : 'Select asset type'}</option>
                {types.map((type) => <option key={type.id} value={type.id}>{type.name}{type.prefix ? ` · ${type.prefix}` : ''}</option>)}
              </FormSelect>
              <FormField label="Serial number" id="asset-serial" value={form.serialNumber} onChange={(event) => set('serialNumber', event.target.value)} placeholder="e.g. ABC123456" />
              <FormField label="Model" id="asset-model" value={form.model} onChange={(event) => set('model', event.target.value)} placeholder="e.g. Latitude 5440" />
              <FormSelect label="Vendor" id="asset-vendor" value={form.vendorId} onChange={(event) => set('vendorId', event.target.value)} disabled={!form.companyId || loadingCompanyData}>
                <option value="">No vendor</option>
                {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </FormSelect>
              <FormSelect label="Condition" id="asset-condition" value={form.condition} onChange={(event) => set('condition', event.target.value)}>
                {CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition.replaceAll('_', ' ')}</option>)}
              </FormSelect>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Organization</p><h3 className="mt-1 text-base font-semibold text-slate-950">Where does this asset belong?</h3><p className="mt-1 text-sm text-slate-500">Selectors cascade from company → site → location → department.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect label="Site" id="asset-site" value={form.siteId} onChange={(event) => { set('siteId', event.target.value); set('locationId', ''); set('departmentId', ''); }} disabled={!selectedCompany}>
                <option value="">Not assigned</option>
                {selectedCompany?.sites?.map((site) => <option key={site.id} value={site.id}>{site.name} · {SITE_LABEL[site.type ?? 'other']}</option>)}
              </FormSelect>
              <FormSelect label="Location" id="asset-location" value={form.locationId} onChange={(event) => { set('locationId', event.target.value); set('departmentId', ''); }} disabled={!selectedSite}>
                <option value="">Not assigned</option>
                {selectedSite?.locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </FormSelect>
              <FormSelect label="Department" id="asset-department" value={form.departmentId} onChange={(event) => set('departmentId', event.target.value)} disabled={!selectedLocation}>
                <option value="">Not assigned</option>
                {selectedLocation?.departments?.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </FormSelect>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Asset number</p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">Generated automatically</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">AssetHub generates the asset number when the record is saved, using the configured asset-type prefix and numbering rule.</p>
          </section>
        </div>
      </ModalBody>
    </Modal>
  );
}
