-- Identity/provenance/conflict model and company/location-scoped RBAC.

CREATE TABLE IF NOT EXISTS external_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  user_name text,
  employee_id text,
  status text NOT NULL DEFAULT 'active',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider, external_id)
);
CREATE INDEX IF NOT EXISTS external_identities_user_idx ON external_identities(tenant_id, company_id, user_id);
CREATE INDEX IF NOT EXISTS external_identities_employee_idx ON external_identities(tenant_id, company_id, employee_id);

-- Employee ID is the business identity key inside a tenant. Existing local users may not have one yet.
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_employee_id_uq
  ON users(tenant_id, employee_id)
  WHERE employee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_field_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  source_type text NOT NULL,
  source_provider text,
  source_external_id text,
  is_locked boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, field_name)
);
CREATE INDEX IF NOT EXISTS user_field_provenance_scope_idx ON user_field_provenance(tenant_id, company_id, user_id);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  local_value jsonb,
  provider_value jsonb,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  resolution text,
  resolved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sync_conflicts_open_idx ON sync_conflicts(tenant_id, company_id, status, created_at);
CREATE INDEX IF NOT EXISTS sync_conflicts_user_idx ON sync_conflicts(user_id, field_name, status);

CREATE TABLE IF NOT EXISTS role_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  scope_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_scopes_type_ck CHECK (
    (scope_type = 'TENANT' AND company_id IS NULL AND location_id IS NULL)
    OR (scope_type = 'COMPANY' AND company_id IS NOT NULL AND location_id IS NULL)
    OR (scope_type = 'LOCATION' AND location_id IS NOT NULL)
  ),
  UNIQUE (role_id, company_id, location_id)
);
CREATE INDEX IF NOT EXISTS role_scopes_role_idx ON role_scopes(role_id);
CREATE INDEX IF NOT EXISTS role_scopes_scope_idx ON role_scopes(tenant_id, company_id, location_id);

-- Provider/AssetHub ownership is explicit. Roles and scopes remain AssetHub-owned.
COMMENT ON TABLE external_identities IS 'Provider-specific identities linked to an AssetHub user; provider groups are intentionally not synchronized.';
COMMENT ON TABLE role_scopes IS 'AssetHub RBAC scope. Identity providers never grant these scopes.';
