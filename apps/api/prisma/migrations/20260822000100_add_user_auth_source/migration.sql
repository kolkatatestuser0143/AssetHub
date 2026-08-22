ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_source text NOT NULL DEFAULT 'LOCAL';

UPDATE users
SET auth_source = CASE
  WHEN account_type = 'SYSTEM' THEN 'LOCAL'
  ELSE 'LOCAL'
END
WHERE auth_source IS NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_auth_source_check;

ALTER TABLE users
  ADD CONSTRAINT users_auth_source_check
  CHECK (auth_source IN ('LOCAL', 'SSO'));

CREATE INDEX IF NOT EXISTS users_tenant_auth_source_active_idx
  ON users (tenant_id, auth_source, is_active);
