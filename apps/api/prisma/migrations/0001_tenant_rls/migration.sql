-- Core tenant isolation for AssetHub.
-- The application must set app.tenant_id and app.company_id inside each transaction.
-- FORCE ROW LEVEL SECURITY is intentional so the table owner is also subject to policies.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
  USING (id::text = current_setting('app.tenant_id', true));

CREATE POLICY company_tenant_isolation ON companies
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY user_tenant_company_isolation ON users
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND company_id::text = current_setting('app.company_id', true)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND company_id::text = current_setting('app.company_id', true)
  );

CREATE POLICY asset_tenant_company_isolation ON assets
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND company_id::text = current_setting('app.company_id', true)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    AND company_id::text = current_setting('app.company_id', true)
  );

CREATE POLICY assignment_tenant_company_isolation ON asset_assignments
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = asset_assignments.asset_id
        AND a.tenant_id::text = current_setting('app.tenant_id', true)
        AND a.company_id::text = current_setting('app.company_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = asset_assignments.asset_id
        AND a.tenant_id::text = current_setting('app.tenant_id', true)
        AND a.company_id::text = current_setting('app.company_id', true)
    )
  );

CREATE INDEX IF NOT EXISTS companies_tenant_id_idx ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS users_tenant_company_idx ON users(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS assets_tenant_company_idx ON assets(tenant_id, company_id);
