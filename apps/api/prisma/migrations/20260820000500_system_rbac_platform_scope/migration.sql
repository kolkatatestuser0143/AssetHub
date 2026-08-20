ALTER TABLE roles ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE roles ALTER COLUMN company_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS roles_platform_scope_idx ON roles(tenant_id, company_id, is_system);

-- Platform roles are deliberately tenant-independent. Organization roles continue
-- to carry tenant_id (and optionally company_id) and remain isolated from platform roles.
CREATE UNIQUE INDEX IF NOT EXISTS roles_platform_name_idx
  ON roles(name)
  WHERE tenant_id IS NULL AND company_id IS NULL;
