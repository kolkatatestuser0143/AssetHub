-- Database-level safety net for Tenant Admin lifecycle changes.
-- The API/UI may prevent unsafe demotions, but this trigger also protects direct SQL/API paths.

CREATE OR REPLACE FUNCTION prevent_last_tenant_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF OLD.account_type = 'TENANT'
     AND OLD.admin_level = 'TENANT_ADMIN'
     AND (
       NEW.admin_level IS DISTINCT FROM OLD.admin_level
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.account_type IS DISTINCT FROM OLD.account_type
     )
     AND (NEW.admin_level <> 'TENANT_ADMIN' OR NEW.is_active = false OR NEW.account_type <> 'TENANT')
  THEN
    SELECT count(*) INTO remaining_admins
    FROM users
    WHERE tenant_id = OLD.tenant_id
      AND account_type = 'TENANT'
      AND admin_level = 'TENANT_ADMIN'
      AND is_active = true
      AND id <> OLD.id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Cannot remove or deactivate the last active Tenant Admin for tenant %', OLD.tenant_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_prevent_last_tenant_admin_removal ON users;
CREATE TRIGGER users_prevent_last_tenant_admin_removal
BEFORE UPDATE OF admin_level, is_active, account_type ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_last_tenant_admin_removal();

COMMENT ON FUNCTION prevent_last_tenant_admin_removal() IS
  'Prevents a tenant from having zero active Tenant Admin accounts.';
