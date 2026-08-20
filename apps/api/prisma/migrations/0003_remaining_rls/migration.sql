-- RLS backstop for newly mapped tenant-owned domains.
-- Company-scoped tables derive tenant membership through companies where needed.

CREATE TABLE IF NOT EXISTS platform_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY; ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY; ALTER TABLE login_history FORCE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY; ALTER TABLE vendors FORCE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY; ALTER TABLE warranties FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_maintenance FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY; ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY; ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE identity_provider_configs ENABLE ROW LEVEL SECURITY; ALTER TABLE identity_provider_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE scim_tokens ENABLE ROW LEVEL SECURITY; ALTER TABLE scim_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE scim_sync_logs ENABLE ROW LEVEL SECURITY; ALTER TABLE scim_sync_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE integration_instances ENABLE ROW LEVEL SECURITY; ALTER TABLE integration_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY; ALTER TABLE custom_field_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_field_values ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_custom_field_values FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_documents ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE platform_admin_notes ENABLE ROW LEVEL SECURITY; ALTER TABLE platform_admin_notes FORCE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation ON roles USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY sessions_tenant_isolation ON sessions USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY login_history_tenant_isolation ON login_history USING (EXISTS (SELECT 1 FROM users u WHERE u.id = login_history.user_id AND u.tenant_id = app.current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = login_history.user_id AND u.tenant_id = app.current_tenant_id()));
CREATE POLICY vendors_company_isolation ON vendors USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = vendors.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id()))) WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = vendors.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id())));
CREATE POLICY warranties_tenant_isolation ON warranties USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY maintenance_tenant_isolation ON asset_maintenance USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY audit_tenant_isolation ON audit_events USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY subscriptions_tenant_isolation ON subscriptions USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY idp_company_isolation ON identity_provider_configs USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = identity_provider_configs.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id()))) WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = identity_provider_configs.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id())));
CREATE POLICY scim_company_isolation ON scim_tokens USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = scim_tokens.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id()))) WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = scim_tokens.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id())));
CREATE POLICY scim_logs_isolation ON scim_sync_logs USING (EXISTS (SELECT 1 FROM scim_tokens s JOIN companies c ON c.id = s.company_id WHERE s.id = scim_sync_logs.scim_token_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id()))) WITH CHECK (EXISTS (SELECT 1 FROM scim_tokens s JOIN companies c ON c.id = s.company_id WHERE s.id = scim_sync_logs.scim_token_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id())));
CREATE POLICY integration_company_isolation ON integration_instances USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = integration_instances.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id()))) WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = integration_instances.company_id AND c.tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR c.id = app.current_company_id())));
CREATE POLICY custom_defs_tenant_isolation ON custom_field_definitions USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY custom_values_tenant_isolation ON asset_custom_field_values USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY documents_tenant_isolation ON asset_documents USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY admin_notes_tenant_isolation ON platform_admin_notes USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
