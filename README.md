# ITAM SaaS — PostgreSQL / Prisma

This branch is the **PostgreSQL migration** of the ITAM SaaS application. It uses **Prisma** as the database access layer and is intended to run against PostgreSQL providers such as **Neon** during development and AWS PostgreSQL/RDS later in production.

> **Status:** PostgreSQL migration is implemented in this branch. Local/Neon database execution and end-to-end verification are still pending.

## Architecture

- **API:** NestJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Development database:** Neon PostgreSQL
- **Future AWS database:** PostgreSQL on AWS/RDS or PostgreSQL on EC2, depending on deployment requirements
- **Object/document storage:** storage abstraction currently supports Uploadcare; production can be moved to Amazon S3 without coupling database persistence to storage
- **Authentication:** JWT access tokens + rotating refresh sessions
- **Identity:** SAML/OIDC providers
- **Provisioning:** SCIM support
- **Authorization:** RBAC + tenant/company scope checks
- **Database security:** PostgreSQL Row-Level Security (RLS) groundwork is included
- **Cache/security state:** Redis

## PostgreSQL migration

The `Postgresql` branch replaces the previous MongoDB/Mongoose persistence layer with Prisma/PostgreSQL.

The Prisma schema covers the major application domains, including:

- Tenants and companies
- Users, sessions and login history
- Sites, locations and departments
- Asset types and assets
- Asset assignments and transfers
- Maintenance, warranties and documents
- Custom fields
- Asset acknowledgements and report templates
- Audit events
- SAML/OIDC identity-provider configuration
- SCIM tokens and synchronization logs
- Integration instances
- Plans, subscriptions and entitlements

The old Mongo/Mongoose runtime layer has been removed from this branch.

## RLS and tenant isolation

PostgreSQL RLS is used as a database-level backstop for tenant/company isolation. Application-level authorization checks remain in place; RLS is **not** intended to replace controller/service authorization.

The API's Prisma layer provides tenant-context support using PostgreSQL transaction-local settings such as:

- `app.tenant_id`
- `app.company_id`

Before enabling RLS against a real development or production database, run the application test suite and verify that every RLS-protected query is executed with the appropriate tenant context.

## Prerequisites

- Node.js / pnpm matching the repository toolchain
- PostgreSQL 14+ recommended
- Neon PostgreSQL for development, or another PostgreSQL instance
- Redis 7+
- Node dependencies installed with pnpm

## Neon development setup

Create a Neon project and database, then copy the PostgreSQL connection details into `.env`.

The application expects:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

`DATABASE_URL` is used by Prisma for normal application access. `DIRECT_URL` is intended for direct database operations such as migrations when required by the Prisma configuration.

Do **not** commit real database credentials, JWT secrets, Redis credentials, or other secrets.

## Prisma commands

From the repository root:

```bash
pnpm install
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma validate
```

For a development database after the Neon connection is configured:

```bash
pnpm --filter api exec prisma migrate dev
```

For a deployment/CI environment where migrations already exist:

```bash
pnpm --filter api exec prisma migrate deploy
```

Run the API with:

```bash
pnpm dev:api
```

## Database migrations

Prisma migrations are the source of truth for PostgreSQL schema changes on this branch.

Before applying migrations to any shared database:

1. Review the migration SQL.
2. Confirm the target database is the intended environment.
3. Back up production data when applicable.
4. Run the migration against a disposable/local database first.
5. Verify RLS policies after migration.

Do not manually edit the production database to compensate for an incomplete Prisma migration.

## RLS testing

RLS has been prepared in the PostgreSQL branch, but it should be validated against a real PostgreSQL database before being considered production-ready.

Test at minimum:

- A tenant cannot read another tenant's records.
- A tenant cannot modify another tenant's records.
- A company cannot access another company inside the same tenant when company isolation is required.
- Cross-company administrative flows still work when explicitly authorized.
- Requests without a valid tenant context cannot bypass RLS.
- Background/system operations use an explicitly controlled database context rather than accepting tenant IDs directly from untrusted clients.

## CI validation

The PostgreSQL validation workflow checks the Prisma layer and API compilation. It runs the equivalent of:

```bash
pnpm install --frozen-lockfile
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma generate
pnpm --filter api build
```

CI validation is useful for catching schema and TypeScript/build errors, but it does **not** replace running the application against a real PostgreSQL database.

## Local testing checklist

When testing this branch locally with Neon:

1. Configure `DATABASE_URL` and `DIRECT_URL`.
2. Configure Redis.
3. Run `prisma validate` and `prisma generate`.
4. Apply Prisma migrations.
5. Run the seed script if/when the PostgreSQL seed is ready.
6. Start the API.
7. Test authentication and sessions.
8. Test tenant/company isolation.
9. Test asset CRUD and lifecycle transitions.
10. Test SSO/SCIM and billing flows.
11. Verify RLS directly with PostgreSQL queries.

## AWS migration path

The application should remain PostgreSQL-provider agnostic.

The intended path is:

```text
Development
    Neon PostgreSQL
         |
         v
Production
    AWS PostgreSQL
    +
    Amazon S3 for documents/files
```

Moving from Neon to AWS should primarily require changing the database connection/deployment infrastructure, not rewriting application persistence code.

For S3 migration, keep using the application's document-storage abstraction so database records store storage metadata/keys rather than embedding provider-specific implementation throughout the asset modules.

## Security notes

- Never commit `.env` or real credentials.
- Use strong, unique JWT and database credentials.
- Keep Redis protected and encrypted in production.
- Do not trust client-provided tenant/company IDs for authorization.
- Keep application authorization checks even with RLS enabled.
- Validate RLS policies with negative cross-tenant tests before production use.
- Rotate any credentials that may have been exposed in repository history.

## Current migration status

### Completed in this branch

- Prisma/PostgreSQL persistence layer
- PostgreSQL Prisma schema for core ITAM domains
- Identity/SCIM persistence models
- Billing/subscription/entitlement persistence
- Prisma-backed identity service
- Prisma-backed entitlement service
- Prisma-backed subscription/audit services
- Mongo/Mongoose runtime cleanup
- PostgreSQL RLS foundation
- Prisma + API build CI validation

### Still requires local/Neon verification

- Prisma migrations against a real PostgreSQL database
- Seed execution
- Full API startup
- End-to-end CRUD tests
- RLS behavior under real PostgreSQL sessions
- SAML/OIDC/SCIM integration testing
- Billing/entitlement integration testing

## Next steps

1. Configure Neon locally.
2. Run Prisma validation/generation and migrations.
3. Fix any migration or TypeScript/runtime errors discovered locally.
4. Run the tenant-isolation/RLS test suite.
5. Complete S3 storage migration when moving toward AWS.
6. Deploy PostgreSQL infrastructure to AWS after the Neon-backed branch is stable.
