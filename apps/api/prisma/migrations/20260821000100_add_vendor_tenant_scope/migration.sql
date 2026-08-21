-- Align vendors with the tenant-scoped Prisma model.
-- Existing vendor rows inherit tenant_id from their company.
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE vendors v
SET tenant_id = c.tenant_id
FROM companies c
WHERE c.id = v.company_id
  AND v.tenant_id IS NULL;

ALTER TABLE vendors
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS vendors_tenant_id_fkey;

ALTER TABLE vendors
  ADD CONSTRAINT vendors_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS vendors_tenant_company_idx
  ON vendors(tenant_id, company_id);
