-- Ensure the Vendor upsert key used by Prisma exists on existing PostgreSQL databases.
-- Guard against duplicate historical rows before creating the unique index.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY company_id, name ORDER BY created_at NULLS LAST, id) AS rn
  FROM vendors
)
DELETE FROM vendors v
USING duplicates d
WHERE v.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS vendors_company_name_key
  ON vendors(company_id, name);
