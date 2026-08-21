-- Harden the previously created session SECURITY DEFINER functions.
-- PostgreSQL recommends trusted schemas plus pg_temp as the final search_path
-- entry for SECURITY DEFINER functions.
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

REVOKE ALL ON FUNCTION app.revoke_session(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_session_family(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.revoke_session(uuid, uuid, text) TO CURRENT_USER;
GRANT EXECUTE ON FUNCTION app.revoke_session_family(text, text) TO CURRENT_USER;
