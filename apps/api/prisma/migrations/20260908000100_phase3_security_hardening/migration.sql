-- Phase 3 production hardening: database-level scope invariants.
-- These checks complement application authorization and RLS; they do not replace either.

CREATE OR REPLACE FUNCTION app.enforce_user_org_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  location_ok boolean;
  department_ok boolean;
BEGIN
  IF NEW.location_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM locations l
      JOIN plants p ON p.id = l.site_id
      WHERE l.id = NEW.location_id
        AND p.tenant_id = NEW.tenant_id
        AND p.company_id = NEW.company_id
    ) INTO location_ok;
    IF NOT location_ok THEN
      RAISE EXCEPTION 'User location is outside the user company scope';
    END IF;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM departments d
      JOIN locations l ON l.id = d.location_id
      JOIN plants p ON p.id = l.site_id
      WHERE d.id = NEW.department_id
        AND p.tenant_id = NEW.tenant_id
        AND p.company_id = NEW.company_id
    ) INTO department_ok;
    IF NOT department_ok THEN
      RAISE EXCEPTION 'User department is outside the user company scope';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_org_scope ON users;
CREATE TRIGGER trg_enforce_user_org_scope
BEFORE INSERT OR UPDATE OF tenant_id, company_id, location_id, department_id
ON users
FOR EACH ROW EXECUTE FUNCTION app.enforce_user_org_scope();

CREATE OR REPLACE FUNCTION app.enforce_asset_org_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ok boolean;
BEGIN
  IF NEW.asset_type_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM asset_types t
      WHERE t.id = NEW.asset_type_id
        AND t.company_id = NEW.company_id
    ) INTO ok;
    IF NOT ok THEN RAISE EXCEPTION 'Asset type is outside the asset company scope'; END IF;
  END IF;

  IF NEW.vendor_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = NEW.vendor_id
        AND v.tenant_id = NEW.tenant_id
        AND v.company_id = NEW.company_id
    ) INTO ok;
    IF NOT ok THEN RAISE EXCEPTION 'Vendor is outside the asset company scope'; END IF;
  END IF;

  IF NEW.location_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM locations l JOIN plants p ON p.id=l.site_id
      WHERE l.id=NEW.location_id
        AND p.tenant_id=NEW.tenant_id
        AND p.company_id=NEW.company_id
    ) INTO ok;
    IF NOT ok THEN RAISE EXCEPTION 'Asset location is outside the asset company scope'; END IF;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM departments d JOIN locations l ON l.id=d.location_id JOIN plants p ON p.id=l.site_id
      WHERE d.id=NEW.department_id
        AND p.tenant_id=NEW.tenant_id
        AND p.company_id=NEW.company_id
    ) INTO ok;
    IF NOT ok THEN RAISE EXCEPTION 'Asset department is outside the asset company scope'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_asset_org_scope ON assets;
CREATE TRIGGER trg_enforce_asset_org_scope
BEFORE INSERT OR UPDATE OF tenant_id, company_id, asset_type_id, vendor_id, location_id, department_id
ON assets
FOR EACH ROW EXECUTE FUNCTION app.enforce_asset_org_scope();

CREATE OR REPLACE FUNCTION app.enforce_assignment_org_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  asset_tenant uuid;
  asset_company uuid;
  user_tenant uuid;
  user_company uuid;
BEGIN
  SELECT tenant_id, company_id INTO asset_tenant, asset_company FROM assets WHERE id = NEW.asset_id;
  SELECT tenant_id, company_id INTO user_tenant, user_company FROM users WHERE id = NEW.user_id;

  IF asset_tenant IS NULL OR user_tenant IS NULL THEN
    RAISE EXCEPTION 'Assignment references missing asset or user';
  END IF;
  IF asset_tenant <> user_tenant OR asset_company <> user_company THEN
    RAISE EXCEPTION 'Asset and assigned user must belong to the same tenant and company';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_assignment_org_scope ON asset_assignments;
CREATE TRIGGER trg_enforce_assignment_org_scope
BEFORE INSERT OR UPDATE OF asset_id, user_id
ON asset_assignments
FOR EACH ROW EXECUTE FUNCTION app.enforce_assignment_org_scope();

-- Database-level guarantee: an asset can have at most one active assignment.
CREATE UNIQUE INDEX IF NOT EXISTS ux_asset_assignments_one_active
ON asset_assignments(asset_id)
WHERE returned_at IS NULL;

-- Validate existing data without PL/pgSQL comparisons between incompatible types.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users u
    WHERE (u.location_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM locations l JOIN plants p ON p.id=l.site_id
      WHERE l.id=u.location_id
        AND p.tenant_id=u.tenant_id
        AND p.company_id=u.company_id
    ))
    OR (u.department_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM departments d JOIN locations l ON l.id=d.location_id JOIN plants p ON p.id=l.site_id
      WHERE d.id=u.department_id
        AND p.tenant_id=u.tenant_id
        AND p.company_id=u.company_id
    ))
  ) THEN
    RAISE EXCEPTION 'Existing users contain cross-company location/department references';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM asset_assignments aa
    JOIN assets a ON a.id=aa.asset_id
    JOIN users u ON u.id=aa.user_id
    WHERE a.tenant_id::text <> u.tenant_id::text
       OR a.company_id::text <> u.company_id::text
  ) THEN
    RAISE EXCEPTION 'Existing asset assignments contain cross-company references';
  END IF;
END;
$$;
