<<<<<<< HEAD
# ITAM SaaS — Foundation Scaffold

This is a **working foundation**, not a finished product. It covers the
master prompt's Phases 1–7 with real (not pseudo-) code, and defines
clean interfaces for the phases that need dedicated, careful
implementation rather than speculative scaffolding.

## What's real and functional here

- **DB schema** (`apps/api/prisma/schema.prisma`) — full multi-tenant model.
- **RLS policies** (`prisma/migrations/0001_rls_policies/`) — Postgres
  row-level security as the isolation backstop.
- **Tenant context + RBAC guards** (`common/guards/`) — every mutating
  route resolves auth context from a verified JWT and re-checks
  permissions server-side.
- **Auth** (`modules/auth/`) — Argon2id hashing, short-lived JWT access
  tokens, rotating single-use refresh tokens, login history, lockout
  hook points. **MFA (TOTP) enforcement is not yet wired into the login
  flow** — see the NOTE in `auth.service.ts`.
- **Assets** (`modules/assets/`) — asset numbering with row-level
  locking (prevents duplicate numbers under concurrent creates) and
  lifecycle-transition audit events.
- **Seed script** (`prisma/seed.ts`) — system roles/permissions + a
  demo tenant/company/admin user.
- **Tenancy** (`modules/tenancy/`) — Company/BusinessUnit/Plant/Location/
  Department CRUD, each write re-verifying the caller's company scope
  server-side before touching the DB (not just trusting RLS).
- **RBAC** (`modules/rbac/`) — list permissions, create custom tenant
  roles, assign roles to users.
- **Assets controller** — exposes `AssetsService` (create + lifecycle
  transition) over HTTP with permission guards.
- **Next.js shell** (`apps/web/`) — login, dashboard with nav, and
  working CRUD screens for Companies, Roles (with permission
  checkboxes), and Assets (asset types + create + lifecycle
  transitions) — all wired to the real API endpoints below.

## What's deliberately stubbed, not built

These are exactly the sections flagged as highest-risk earlier — the
kind of code where a plausible-looking but subtly wrong implementation
is worse than an honest gap:

- **SAML/OIDC** (`modules/identity/`) — real implementation now, not
  just an interface: `@node-saml/node-saml` for SAML (signature,
  audience/issuer, and assertion-window validation — not hand-rolled),
  `openid-client` for OIDC (state+nonce+PKCE always, ID token signature/
  issuer/audience validated by the library). Both feed into the shared
  `ProvisioningService` so there's one place that creates/updates users
  from an external identity, matching architecture doc §8.
- **SCIM** — not scaffolded yet; schema exists (`ScimToken`,
  `ScimSyncLog`), service/controller do not.
- **AD/Entra connector-agent** — not scaffolded; architecture doc §10
  covers the outbound-only design.
- **Integrations** (`modules/integrations/`) — interface + mock
  connector only. Real adapters (JumpCloud first, per your infra) TODO.
- **Billing/entitlements** — schema exists, no service logic yet.
- **Notifications, platform-admin, audit reporting UI** — not started.

## Before this touches real data

1. Run the RLS migration against a **non-owner** DB role (see comment
   in the migration file) — RLS is silently bypassed for table owners.
2. Rotate the seeded demo admin password immediately
   (`forcePasswordReset: true` is set, but don't rely on that alone).
3. Wire MFA enforcement into `AuthService.login()` before exposing this
   past a local dev environment.
4. Run the cross-tenant isolation suite against a disposable Postgres
   test DB before every deploy — `pnpm test:security` (see below).
   It already caught and fixed one real gap during authoring (see
   `test/security/tenant-isolation.spec.ts` comments): `AssetType`
   was reachable by ID substitution across tenants because it had no
   RLS policy and no app-level ownership check. Treat any future
   failure here the same way — a security incident, not a normal
   test failure.

## Running locally

```
cp .env.example .env      # fill in real secrets
docker compose -f docker/docker-compose.dev.yml up -d postgres redis
pnpm install
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev:api
```

## Running the cross-tenant isolation test suite

```
# Point at a DISPOSABLE test database, never the dev/prod one —
# the suite creates and deletes real tenants/companies/users.
DATABASE_URL=postgresql://itam_app:...@localhost:5432/itam_test \
  pnpm --filter api exec prisma migrate deploy
DATABASE_URL=postgresql://itam_app:...@localhost:5432/itam_test \
  pnpm --filter api test:security
```

Run this in CI on every PR that touches a module, guard, or the schema
— it's the single test suite in this repo where a failure means stop,
not "flaky, retry."

## SAML/OIDC — what's genuinely done vs. what's not

- **Session issuance is now real.** SSO callbacks (`IdentityController`)
  provision the user via `ProvisioningService`, then issue a real
  session via the same `SessionService` password login uses
  (`AuthService` and `IdentityService` both depend on it — no
  circular import, no parallel session logic). The callback returns
  `{ accessToken, refreshToken }`, identical shape to `/auth/login`.
- **Test coverage added** (`test/security/identity.spec.ts`) for the
  primitives that matter most: replay protection (an assertion/state
  key can only be consumed once), OIDC state forgery/expiry rejection,
  and SAML config refusing to proceed without an IdP certificate.
- **Still not covered**: a full signature-mismatch test against a real
  signed SAML response. That needs either a live test IdP or a
  hand-built, properly-signed XML fixture — deliberately not faked
  here, since a fake fixture would test nothing real. This is the
  next thing to add before trusting SAML with production traffic.
- **Refresh-token reuse detection is per-session, not per-family** —
  noted directly in `auth.service.ts`. A stolen-and-replayed refresh
  token is caught (its row is already revoked), but a fuller
  implementation would revoke every session descended from the same
  original login on detected reuse, not just the one row.

## Next steps, in roadmap order

Signed-fixture SAML test → refresh-token family revocation → SCIM
(natural next step, shares `ProvisioningService`) → audit query API →
QR/barcode → import/export → AD/Entra connector.

## Known gaps to be aware of before real usage

- `access_token` handling in `apps/web/src/lib/api-client.ts` is an
  in-memory placeholder — refresh-on-401 is a TODO, and the refresh
  token should be an httpOnly cookie set by the API, not handled by
  frontend JS at all.
- `ForbiddenException` in `tenancy.service.ts` scope checks — confirm
  this surfaces as a clean 403 through Nest's exception filters (it
  should by default, but verify once other modules add custom filters).
- No automated cross-tenant isolation tests yet — still the single
  highest-priority thing to add before trusting this with real data.
=======
# AssetHub
>>>>>>> 39a8550a03acfaff4b54ba7e5db58f71947db63a
