# AssetHub Architecture

## 1. System shape

AssetHub is a pnpm workspace with a Next.js web application and a NestJS API, backed by PostgreSQL through Prisma.

```text
Browser
  ├─ Tenant Console
  └─ System Admin Console
          │
          ▼
      Next.js Web
          │
          ▼
      NestJS API
          │
          ├─ Auth / sessions
          ├─ Tenant / organization
          ├─ Assets / assignments / lifecycle
          ├─ Users / RBAC
          ├─ Identity / SCIM
          ├─ Billing / licensing
          ├─ Notifications
          ├─ Audit / security / operations
          └─ System Admin control plane
          │
          ▼
       Prisma ORM
          │
          ▼
      PostgreSQL
```

## 2. Web application

The web application uses separate route spaces for Tenant and System Admin. Shared UI primitives live under `apps/web/src/components` and shared client helpers live under `apps/web/src/lib`.

Important shared contracts include:

- `Button`
- `FormField`
- `FormSelect`
- `FormTextarea`
- `PasswordInput`
- `Modal`
- `ConfirmDialog`
- `LoadingSkeleton` / shared loading state
- Toast/notification primitives

The web layer should not bypass shared interaction contracts without a documented reason.

## 3. API application

The API is organized by NestJS modules. Authentication, tenant boundaries, RBAC, billing and audit concerns should remain explicit module/service responsibilities rather than being duplicated in controllers or pages.

Sensitive mutations should validate authorization server-side even when the UI already hides or disables the corresponding control.

## 4. Tenant isolation

Tenant identity is derived from authenticated context and/or the approved System Admin execution path. Tenant-scoped services must enforce the tenant constraint at the API/service layer.

System Admin operations are explicitly platform-scoped and must not be confused with tenant-scoped operations.

## 5. Data ownership

PostgreSQL is the system of record for transactional data. Prisma schema/migrations are the source of database evolution. Migrations must be committed with code that depends on them and must be verified before production deployment.

## 6. Frontend/backend contract rule

A visible mutation control must map to a real backend capability, including:

- endpoint;
- HTTP method;
- authorization requirement;
- request payload;
- error behavior;
- post-mutation refresh behavior.

Read-only pages should be explicitly treated as read-only instead of exposing inert mutation controls.

## 7. Observability

HTTP request IDs, application logs, audit records, notifications and security events should remain distinguishable. User-facing error messages should be safe and actionable; sensitive backend details belong in server logs.
