# AssetHub Release Plan

## Pre-release gate

1. Merge code and documentation changes.
2. Confirm working tree/branch is clean.
3. Run API and web builds.
4. Validate Prisma schema and migration status.
5. Review environment variables and secrets.
6. Run Tenant and System smoke tests.
7. Verify audit/security logging.
8. Verify backup/rollback procedure.

## Database release

Production deployment should use committed migrations and `prisma migrate deploy`. Migration history must match the target database before application traffic is switched to the new build.

## Application release

Deploy API and web artifacts from the same release revision whenever possible. Avoid deploying a frontend that expects an API contract not yet present in the backend.

## Rollback

If an application regression occurs:

- stop or divert traffic from the bad release;
- restore the previous application revision;
- do not automatically roll back destructive database migrations;
- investigate data/schema compatibility before any database rollback.

## Smoke test after release

- System login.
- Tenant login.
- Tenant asset list/search.
- Tenant create/edit/delete of a safe test record.
- System tenant list and Tenant 360.
- Subscription read and safe lifecycle check.
- Notification/read state if enabled.
- Audit event creation for a tested mutation.
