# AssetHub Database Guide

## Source of truth

PostgreSQL is the transactional datastore and Prisma is the schema/migration layer.

Database evolution rules:

- Change `schema.prisma` first.
- Generate Prisma Client after schema changes.
- Create a migration for intentional database changes.
- Run migration status before deployment.
- Never treat a generated client as proof that the database is migrated.

## Core data domains

The database model supports at least these domains:

- Users and sessions.
- Tenants and tenant administrators.
- Organizations: companies, sites, locations and departments.
- Assets and asset types.
- Assignments and lifecycle history.
- Vendors and warranties.
- Roles and permissions.
- Identity providers and SCIM credentials/logs.
- Plans, subscriptions and entitlements.
- Audit/security activity.
- Notifications and deduplication.

## Tenant isolation

Tenant-owned records must carry a reliable tenant relationship or be reachable only through a parent entity with an enforced tenant constraint. Queries must never trust client-supplied tenant IDs without validating authenticated scope.

System Admin repositories/services may intentionally operate across tenants, but that authority must be explicit and permission-protected.

## Migration safety

Before deployment:

```text
prisma validate
prisma generate
prisma migrate status
prisma migrate deploy
```

For a migration timeout or advisory-lock error, inspect active application/migration processes and database connectivity before retrying. Do not create duplicate migrations merely because a deploy command timed out.

## Indexing principles

Index high-cardinality foreign keys, tenant-scoped lookup paths, unique business identifiers and frequently filtered lifecycle/status columns. Search design should be evaluated against actual query plans as data volume grows.

## Data retention

Audit/security records should be retained according to the organization's compliance and operational policy. Destructive UI actions should prefer reversible lifecycle operations when the business domain requires historical traceability.
