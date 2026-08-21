-- Initial PostgreSQL schema for the core AssetHub domain.
-- This migration MUST run before the RLS migrations because those migrations
-- reference these tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  primary_user_id uuid,
  primary_email text,
  phone text,
  website text,
  logo_file_id text,
  logo_url text,
  favicon_file_id text,
  favicon_url text,
  suspended_at timestamptz,
  suspended_by uuid,
  suspension_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenants_status_idx ON tenants(status);

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_tenant_code_key UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS companies_tenant_id_idx ON companies(tenant_id);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'TENANT',
  admin_level text NOT NULL DEFAULT 'EMPLOYEE',
  employee_id text,
  email text NOT NULL,
  password_hash text,
  first_name text,
  last_name text,
  job_title text,
  phone text,
  mfa_method text NOT NULL DEFAULT 'NONE',
  totp_secret_enc text,
  backup_codes_hash text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  force_password_reset boolean NOT NULL DEFAULT false,
  auth_version integer NOT NULL DEFAULT 0,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  access_token_hash text,
  access_token_issued_at timestamptz,
  access_token_expires_at timestamptz,
  external_scim_id text,
  role_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  department_id text,
  location_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_tenant_email_key UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS users_tenant_company_idx ON users(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS users_tenant_admin_active_idx ON users(tenant_id, admin_level, is_active);
CREATE INDEX IF NOT EXISTS users_account_access_token_idx ON users(account_type, access_token_hash);

CREATE TABLE IF NOT EXISTS plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'plant',
  name text NOT NULL
);
CREATE INDEX IF NOT EXISTS plants_tenant_company_idx ON plants(tenant_id, company_id);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  name text NOT NULL
);
CREATE INDEX IF NOT EXISTS locations_site_id_idx ON locations(site_id);

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL
);
CREATE INDEX IF NOT EXISTS departments_location_id_idx ON departments(location_id);

CREATE TABLE IF NOT EXISTS asset_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text,
  separator text NOT NULL DEFAULT '-',
  padding integer NOT NULL DEFAULT 6,
  next_sequence integer NOT NULL DEFAULT 1,
  CONSTRAINT asset_types_company_name_key UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_type_id uuid REFERENCES asset_types(id) ON DELETE SET NULL,
  asset_number text NOT NULL,
  serial_number text,
  model text,
  status text NOT NULL DEFAULT 'in_stock',
  condition text NOT NULL DEFAULT 'good',
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  vendor_id uuid,
  purchase_date timestamptz,
  warranty_provider text,
  warranty_expires_at timestamptz,
  qr_code_url text,
  barcode_value text,
  custom_fields jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_company_asset_number_key UNIQUE (company_id, asset_number)
);
CREATE INDEX IF NOT EXISTS assets_tenant_company_status_created_idx ON assets(tenant_id, company_id, status, created_at);
CREATE INDEX IF NOT EXISTS assets_tenant_company_type_created_idx ON assets(tenant_id, company_id, asset_type_id, created_at);
CREATE INDEX IF NOT EXISTS assets_tenant_company_created_idx ON assets(tenant_id, company_id, created_at);

CREATE TABLE IF NOT EXISTS asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  notes text,
  condition_at_return text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_assignments_asset_returned_idx ON asset_assignments(asset_id, returned_at);
CREATE INDEX IF NOT EXISTS asset_assignments_user_returned_idx ON asset_assignments(user_id, returned_at);
