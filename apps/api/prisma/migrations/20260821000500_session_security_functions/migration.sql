-- Session rotation/logout operations must work before tenant context is known.
-- These narrow SECURITY DEFINER functions preserve the sessions RLS policy while
-- allowing bearer-token based session operations to resolve/revoke only exact rows.
CREATE OR REPLACE FUNCTION app.revoke_session(p_id uuid, p_user_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
VOLATILE
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.sessions
     SET revoked_at = now(), revoked_reason = p_reason, updated_at = now()
   WHERE id = p_id AND user_id = p_user_id AND revoked_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION app.revoke_session_family(p_family_id text, p_reason text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
VOLATILE
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.sessions
     SET revoked_at = now(), revoked_reason = p_reason, updated_at = now()
   WHERE family_id = p_family_id AND revoked_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Runtime execution must be limited to the application database role rather than
-- every database principal. CURRENT_USER is the role executing this migration and
-- is also the expected application role in this deployment model.
REVOKE ALL ON FUNCTION app.revoke_session(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_session_family(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.revoke_session(uuid, uuid, text) TO CURRENT_USER;
GRANT EXECUTE ON FUNCTION app.revoke_session_family(text, text) TO CURRENT_USER;
