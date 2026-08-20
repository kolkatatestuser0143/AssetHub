CREATE TABLE IF NOT EXISTS asset_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_state text, to_state text NOT NULL, actor_user_id uuid, reason text, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_audit_events_asset_idx ON asset_audit_events(asset_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS asset_audit_events_scope_idx ON asset_audit_events(tenant_id, company_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS asset_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_user_id uuid, from_location_id uuid, from_department_id uuid, to_user_id uuid, to_location_id uuid, to_department_id uuid,
  requested_by_user_id uuid NOT NULL, approved_by_user_id uuid, completed_by_user_id uuid, cancelled_by_user_id uuid,
  status text NOT NULL, requested_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
  approval_note text, completion_note text, cancellation_note text, reason text
);
CREATE INDEX IF NOT EXISTS asset_transfers_scope_idx ON asset_transfers(tenant_id, asset_id, status);
CREATE INDEX IF NOT EXISTS asset_transfers_requested_idx ON asset_transfers(tenant_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS asset_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL, description text, filters jsonb NOT NULL DEFAULT '{}'::jsonb, created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS asset_report_templates_scope_idx ON asset_report_templates(tenant_id, name);

CREATE TABLE IF NOT EXISTS asset_acknowledgement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL, content text NOT NULL, created_by uuid, is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_ack_templates_scope_idx ON asset_acknowledgement_templates(tenant_id, is_default);

CREATE TABLE IF NOT EXISTS asset_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL, template_id uuid NOT NULL REFERENCES asset_acknowledgement_templates(id) ON DELETE RESTRICT,
  template_name text NOT NULL, content_snapshot text NOT NULL, document_id text, generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by_user_id uuid NOT NULL, status text NOT NULL DEFAULT 'PENDING', acknowledged_at timestamptz,
  acknowledged_by_user_id uuid, acknowledgement_note text
);
CREATE INDEX IF NOT EXISTS asset_acknowledgements_scope_idx ON asset_acknowledgements(tenant_id, company_id, asset_id, generated_at DESC);

ALTER TABLE asset_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transfers FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_report_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_acknowledgement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_acknowledgement_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_acknowledgements FORCE ROW LEVEL SECURITY;

CREATE POLICY asset_audit_events_isolation ON asset_audit_events USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY asset_transfers_isolation ON asset_transfers USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
CREATE POLICY asset_report_templates_isolation ON asset_report_templates USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY asset_ack_templates_isolation ON asset_acknowledgement_templates USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY asset_acknowledgements_isolation ON asset_acknowledgements USING (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id())) WITH CHECK (tenant_id = app.current_tenant_id() AND (app.current_company_id() IS NULL OR company_id = app.current_company_id()));
