-- Tenant isolation is a database backstop. Application code should still scope queries.
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.company_id', true), '')::uuid
$$;

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

DROP POLICY IF EXISTS tenants_isolation ON tenants;
CREATE POLICY tenants_isolation ON tenants
  USING (id = app.current_tenant_id())
  WITH CHECK (id = app.current_tenant_id());

DROP POLICY IF EXISTS companies_isolation ON companies;
CREATE POLICY companies_isolation ON companies
  USING (tenant_id = app.current_tenant_id()
         AND (app.current_company_id() IS NULL OR id = app.current_company_id()))
  WITH CHECK (tenant_id = app.current_tenant_id()
              AND (app.current_company_id() IS NULL OR id = app.current_company_id()));

DROP POLICY IF EXISTS users_isolation ON users;
CREATE POLICY users_isolation ON users
  USING (tenant_id = app.current_tenant_id()
         AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()))
  WITH CHECK (tenant_id = app.current_tenant_id()
              AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));

DROP POLICY IF EXISTS assets_isolation ON assets;
CREATE POLICY assets_isolation ON assets
  USING (tenant_id = app.current_tenant_id()
         AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()))
  WITH CHECK (tenant_id = app.current_tenant_id()
              AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));

DROP POLICY IF EXISTS asset_assignments_isolation ON asset_assignments;
CREATE POLICY asset_assignments_isolation ON asset_assignments
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = asset_assignments.asset_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = asset_assignments.asset_id
    )
  );
