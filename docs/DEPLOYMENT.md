# AssetHub Deployment Guide

## Environments

Keep separate configuration for development, staging and production. Never copy production secrets into source control.

## Required configuration

Use `.env.example` as the configuration reference. Typical production configuration covers:

- PostgreSQL connection string.
- Application/API base URL.
- Authentication/session secrets.
- CSRF configuration.
- Upload/storage provider configuration.
- License/public-key configuration.
- Mail provider configuration.
- Feature/license configuration.

## Build

```powershell
pnpm install
pnpm --filter api build
pnpm --filter web build
```

## Prisma

```powershell
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma migrate status
pnpm --filter api exec prisma migrate deploy
```

Use `migrate deploy` for production. Do not use `migrate dev` against the production database.

## Deployment order

1. Provision/verify PostgreSQL.
2. Apply approved migrations.
3. Deploy API.
4. Verify health/readiness.
5. Deploy web.
6. Execute smoke tests.
7. Monitor application and database logs.

## Operational checks

- Database connectivity.
- API health.
- Authentication flows.
- Upload/storage connectivity.
- Mail connectivity where enabled.
- License verification.
- Notification processing.
- Error logs and request IDs.

## Migration locking

If Prisma reports an advisory-lock timeout, first verify no other migration process is active and that the database is responsive. Retry only after identifying the competing/expired process. Do not create a new migration solely to bypass a lock.
