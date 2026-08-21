-- Populate the required session tenant scope from the owning user.
-- The application intentionally keeps tenant_id out of the Session Prisma model;
-- the database remains authoritative for this required isolation column.

CREATE OR REPLACE FUNCTION app.set_session_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id
      INTO NEW.tenant_id
      FROM users u
     WHERE u.id = NEW.user_id;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unable to determine tenant_id for session user %', NEW.user_id
      USING ERRCODE = '23502';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_set_tenant_id ON sessions;
CREATE TRIGGER sessions_set_tenant_id
BEFORE INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION app.set_session_tenant_id();
