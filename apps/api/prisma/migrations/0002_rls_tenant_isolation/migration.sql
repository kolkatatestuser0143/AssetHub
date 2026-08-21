-- RLS context is set per transaction by PrismaService.withTenantContext().
-- app.tenant_id is mandatory for tenant-scoped access.
-- app.company_id is the selected company; empty means cross-company tenant scope.

CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_company_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.company_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_company_in_current_tenant(p_company_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = p_company_id AND c.tenant_id = app_current_tenant_id()
  )
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = app_current_tenant_id())
  WITH CHECK (id = app_current_tenant_id());

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON companies;
CREATE POLICY company_isolation ON companies
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON users;
CREATE POLICY user_isolation ON users
  USING (tenant_id = app_current_tenant_id() AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (tenant_id = app_current_tenant_id() AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_isolation ON assets;
CREATE POLICY asset_isolation ON assets
  USING (tenant_id = app_current_tenant_id() AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (tenant_id = app_current_tenant_id() AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

-- Prisma model Site maps to the PostgreSQL table plants.
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_isolation ON plants;
CREATE POLICY site_isolation ON plants
  USING (tenant_id = app_current_tenant_id() AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (tenant_id = app_current_tenant_id() AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_types FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_type_isolation ON asset_types;
CREATE POLICY asset_type_isolation ON asset_types
  USING (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendor_isolation ON vendors;
CREATE POLICY vendor_isolation ON vendors
  USING (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

ALTER TABLE identity_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_provider_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS identity_provider_isolation ON identity_provider_configs;
CREATE POLICY identity_provider_isolation ON identity_provider_configs
  USING (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

ALTER TABLE scim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scim_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scim_token_isolation ON scim_tokens;
CREATE POLICY scim_token_isolation ON scim_tokens
  USING (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

ALTER TABLE integration_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_instances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_isolation ON integration_instances;
CREATE POLICY integration_isolation ON integration_instances
  USING (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()))
  WITH CHECK (app_company_in_current_tenant(company_id) AND (app_current_company_id() IS NULL OR company_id = app_current_company_id()));

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_isolation ON subscriptions;
CREATE POLICY subscription_isolation ON subscriptions
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS entitlement_isolation ON entitlements;
CREATE POLICY entitlement_isolation ON entitlements
  USING (EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = subscription_id AND s.tenant_id = app_current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = subscription_id AND s.tenant_id = app_current_tenant_id()));

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_event_isolation ON audit_events;
CREATE POLICY audit_event_isolation ON audit_events
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_isolation ON sessions;
CREATE POLICY session_isolation ON sessions
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.tenant_id = app_current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.tenant_id = app_current_tenant_id()));

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS login_history_isolation ON login_history;
CREATE POLICY login_history_isolation ON login_history
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.tenant_id = app_current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.tenant_id = app_current_tenant_id()));
