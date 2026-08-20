-- Remaining domain tables mapped from the Mongo schemas.
-- These tables intentionally use UUID foreign keys and JSONB for flexible configuration/metadata.

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, description text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE, name text NOT NULL, is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE, PRIMARY KEY(role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE, PRIMARY KEY(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, refresh_token_hash text NOT NULL UNIQUE,
  family_id text NOT NULL, parent_token_hash text, ip_address text, user_agent text, approx_location text,
  last_seen_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz, revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS sessions_family_idx ON sessions(family_id, revoked_at);

CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  success boolean NOT NULL, ip_address text, user_agent text, reason text, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_history_user_idx ON login_history(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL, contact text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendors_company_idx ON vendors(company_id);

CREATE TABLE IF NOT EXISTS warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, asset_id uuid NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  provider text, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  service_date timestamptz NOT NULL, service_type text NOT NULL, provider text, technician text, notes text,
  next_service_date timestamptz, attachment_document_id text, created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_maintenance_idx ON asset_maintenance(tenant_id, company_id, asset_id, service_date DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL, actor_user_id uuid, action text NOT NULL,
  target_type text, target_id text, metadata jsonb, result text, route text, method text, status_code integer,
  request_id text, ip_address text, user_agent text, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_tenant_idx ON audit_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_company_idx ON audit_events(company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, theme_preset text NOT NULL DEFAULT 'starter',
  features jsonb, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT, status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz, grace_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_tenant_idx ON subscriptions(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_idx ON subscriptions(tenant_id)
  WHERE status IN ('active','trialing','past_due');
CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  key text NOT NULL, value jsonb NOT NULL, source text NOT NULL DEFAULT 'plan',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(subscription_id,key)
);

CREATE TABLE IF NOT EXISTS identity_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  protocol text NOT NULL, name text NOT NULL, config jsonb NOT NULL, attribute_mapping jsonb NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idp_company_name_idx ON identity_provider_configs(company_id,name);
CREATE TABLE IF NOT EXISTS scim_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, label text, deprovision_policy text NOT NULL DEFAULT 'disable_login', revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scim_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scim_token_id uuid NOT NULL REFERENCES scim_tokens(id) ON DELETE CASCADE,
  operation text NOT NULL, external_id text, payload_hash text NOT NULL, success boolean NOT NULL, error_message text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scim_sync_logs_idx ON scim_sync_logs(scim_token_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS integration_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind text NOT NULL, provider text NOT NULL, is_mock boolean NOT NULL DEFAULT false, credential_ref text,
  config jsonb, last_sync_at timestamptz, last_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_company_provider_idx ON integration_instances(company_id,provider);

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, key text NOT NULL, label text NOT NULL, field_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,key)
);
CREATE TABLE IF NOT EXISTS asset_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, asset_id uuid NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  values jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS asset_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  s3_key text NOT NULL, storage_provider text NOT NULL DEFAULT 'uploadcare', file_name text NOT NULL,
  content_type text, size_bytes bigint, document_type text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,company_id,s3_key)
);
CREATE INDEX IF NOT EXISTS asset_documents_asset_idx ON asset_documents(tenant_id,company_id,asset_id);
