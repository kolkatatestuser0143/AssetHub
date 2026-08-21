-- Repair RBAC permission metadata for databases created before the
-- permissions.name/description columns were present.
ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS description text;
