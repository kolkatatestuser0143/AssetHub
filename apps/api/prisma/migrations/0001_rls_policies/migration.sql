-- Row-Level Security backstop (architecture doc §5).
-- Applies to every table carrying tenant_id. Application-level filtering
-- in TenantScopedRepository is the primary defense; this catches anything
-- that slips past it.

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
-- Repeat for every other tenant_id-bearing table as they're added.

-- AssetType has no tenant_id column directly (only companyId) — RLS
-- here is expressed via a subquery against Company, since that's the
-- only tenant-scoping path available. This is slower than a direct
-- column comparison; if AssetType/AssetNumberingRule prove to be hot
-- paths, consider denormalizing tenant_id onto them instead, matching
-- the pattern used everywhere else in this schema.
ALTER TABLE "AssetType" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_asset_type ON "AssetType"
  USING (
    "companyId" IN (
      SELECT id FROM "Company" WHERE tenant_id = current_setting('app.tenant_id', true)
    )
  );

CREATE POLICY tenant_isolation_company ON "Company"
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_user ON "User"
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_asset ON "Asset"
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_audit ON "AuditEvent"
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_role ON "Role"
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_subscription ON "Subscription"
  USING (tenant_id = current_setting('app.tenant_id', true));

-- The application DB user must NOT be a superuser/table owner, or RLS
-- is bypassed automatically. Create a dedicated non-owner role:
--   CREATE ROLE itam_app LOGIN PASSWORD '...';
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO itam_app;
-- and point DATABASE_URL at itam_app, not the migration-owning role.
