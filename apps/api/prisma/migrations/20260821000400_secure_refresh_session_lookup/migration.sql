-- Securely resolve a refresh-token hash before tenant context is known.
-- The function exposes only the fields needed by the refresh/logout flow.
CREATE OR REPLACE FUNCTION app.lookup_session_by_refresh_hash(p_hash text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  tenant_id uuid,
  refresh_token_hash text,
  family_id text,
  parent_token_hash text,
  ip_address text,
  user_agent text,
  approx_location text,
  last_seen_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.id, s.user_id, s.tenant_id, s.refresh_token_hash, s.family_id,
         s.parent_token_hash, s.ip_address, s.user_agent, s.approx_location,
         s.last_seen_at, s.expires_at, s.revoked_at, s.revoked_reason,
         s.created_at, s.updated_at
    FROM sessions s
   WHERE s.refresh_token_hash = p_hash
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app.lookup_session_by_refresh_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.lookup_session_by_refresh_hash(text) TO PUBLIC;
