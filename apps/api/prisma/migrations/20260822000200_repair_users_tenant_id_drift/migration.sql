-- Repairs databases whose Prisma migration history says the core schema is
-- applied but the legacy users table predates the tenant relationship.
-- This migration is intentionally idempotent and preserves existing data.

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'users table does not exist; apply the initial AssetHub schema before this repair migration';
  END IF;

  IF to_regclass('public.companies') IS NULL THEN
    RAISE EXCEPTION 'companies table does not exist; cannot safely backfill users.tenant_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN tenant_id uuid;
  END IF;

  UPDATE public.users u
  SET tenant_id = c.tenant_id
  FROM public.companies c
  WHERE u.company_id = c.id
    AND u.tenant_id IS NULL;

  IF EXISTS (SELECT 1 FROM public.users WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot safely backfill users.tenant_id: one or more users have no matching company/tenant';
  END IF;

  ALTER TABLE public.users ALTER COLUMN tenant_id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='users_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='users_tenant_email_key'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_tenant_email_key UNIQUE (tenant_id, email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='users_tenant_company_idx'
  ) THEN
    CREATE INDEX users_tenant_company_idx ON public.users(tenant_id, company_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='users_tenant_admin_active_idx'
  ) THEN
    CREATE INDEX users_tenant_admin_active_idx ON public.users(tenant_id, admin_level, is_active);
  END IF;
END $$;
