# ITAM SaaS — Foundation Scaffold

This is a **working foundation**, not a finished product. It covers the
master prompt's Phases 1–7 with real (not pseudo-) code, and defines
clean interfaces for the phases that need dedicated, careful
implementation rather than speculative scaffolding.

## What's real and functional here

- **DB schema** (`apps/api/src/models/*.schemas.ts`) — full multi-tenant
  model as Mongoose schemas (MongoDB Atlas).
- **Tenant isolation** — MongoDB has no row-level-security equivalent,
  so isolation is application-level filtering only, enforced via
  `TenantScopedRepository`/`scope()` in every service. See
  `apps/api/src/common/tenant-scoped.repository.ts` for the full
  rationale — there is no backstop layer, so this is the whole story.
- **Tenant context + RBAC guards** (`common/guards/`) — every mutating
  route resolves auth context from a verified JWT and re-checks
  permissions server-side.
- **Auth** (`modules/auth/`) — Argon2id hashing, short-lived JWT access
  tokens, rotating single-use refresh tokens, login history, lockout
  hook points. **MFA (TOTP) enforcement is not yet wired into the login
  flow** — see the NOTE in `auth.service.ts`.
- **Assets** (`modules/assets/`) — asset numbering via an atomic
  `findOneAndUpdate`/`$inc` on the numbering rule (prevents duplicate
  numbers under concurrent creates — MongoDB has no `SELECT ... FOR
  UPDATE`, so two concurrent requests serialize on this instead) and
  lifecycle-transition audit events.
- **Seed script** (`apps/api/db/seed.ts`) — system roles/permissions +
  a demo tenant/company/admin user.
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

1. Rotate the seeded demo admin password immediately
   (`forcePasswordReset: true` is set, but don't rely on that alone).
2. Wire MFA enforcement into `AuthService.login()` before exposing this
   past a local dev environment.
3. Run the cross-tenant isolation suite against a disposable MongoDB
   test database before every deploy — `pnpm test:security` (see
   below). It already caught and fixed one real gap during authoring
   (see `test/security/tenant-isolation.spec.ts` comments): `AssetType`
   was reachable by ID substitution across tenants because it had no
   app-level ownership check. MongoDB has no RLS equivalent, so this
   suite is the *only* thing that catches a missing `scope()` call —
   treat any future failure here as a security incident, not a normal
   test failure.
4. Rotate any credentials that were ever committed to `.env` in this
   repo's history (Atlas URI, Redis token, JWT secret) before using
   this past local dev — see `.env.example` for the variables that
   should be filled with fresh secrets, never the committed ones.

## Prerequisites (no Docker)

- **MongoDB Atlas** (or any MongoDB 6+) — put the connection string in
  `MONGODB_URI` (see `.env.example`). There is no RLS-equivalent role
  split here — the app connects with one role, and isolation is
  entirely the application-level `scope()` filtering described above.
- **Redis 7** (managed or self-hosted, reachable via `REDIS_URL`). This
  project uses **Upstash Redis** by default. Redis backs the identity
  module's OIDC state/nonce store and SAML assertion-ID replay
  protection — it is a hard runtime dependency of the API.
  - `.env` uses Upstash's wire-protocol URL (`rediss://…:6379`), which
    `ioredis` connects to over TLS. See `.env.example` for the exact
    variables (`REDIS_URL`, `UPSTASH_REDIS_REST_URL`,
    `UPSTASH_REDIS_REST_TOKEN`) — get the values from Upstash console
    → Database → **Connect**.
  - Any Redis 7+ works: set `REDIS_URL` to your instance. Local
    `redis://localhost:6379` also works if no `REDIS_URL` is set.

## Setting up MongoDB

### Option A — MongoDB Atlas (recommended, matches `.env` default)

1. Create a free/shared cluster at https://cloud.mongodb.com.
2. Database Access → add a user with a strong generated password
   (read/write on this project's database only — don't reuse the
   Atlas org admin credentials here).
3. Network Access → add your current IP (or `0.0.0.0/0` only for
   throwaway local dev, never for anything shared).
4. Connect → Drivers → copy the `mongodb+srv://...` connection string
   into `MONGODB_URI` in `.env`, and set `MONGODB_DB` to your database
   name (e.g. `itam`).
5. Seed it:

   ```
   pnpm --filter api exec ts-node db/seed.ts
   ```

### Option B — local MongoDB

Run MongoDB 6+ locally or via a container image, then point
`MONGODB_URI` at it, e.g. `mongodb://localhost:27017/itam`. Everything
else (seed script, app startup) is identical to Option A.

Unlike the old Postgres setup, there's no owner-vs-app role split to
worry about — MongoDB isolation is entirely the application-level
`scope()` filtering in the service layer, not a DB-level grant, so one
connection string covers migrations/seed and the running app.

## Running locally

```
cp .env.example .env      # fill in real secrets; point at your MongoDB Atlas + Redis
pnpm install
pnpm --filter api exec ts-node db/seed.ts   # seed roles/permissions + demo tenant
pnpm dev:api
```

The API's `IdentitySecurityCacheService` defaults to
`redis://localhost:6379` when `REDIS_URL` is unset.

## Running the cross-tenant isolation test suite

```
# Point at a DISPOSABLE test database, never the dev/prod one —
# the suite creates and deletes real tenants/companies/users.
MONGODB_URI=mongodb+srv://.../itam_test \
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
- `AssetsService.listAssetTypes` filters by `companyId` only, doesn't
  go through `scope()`/`TenantScopedRepository`, and isn't covered by
  `test/security/tenant-isolation.spec.ts`. Not currently exploitable
  (Mongo `companyId`s are globally-unique ObjectIds) but inconsistent
  with the rest of the service layer and untested — fix before relying
  on it.
- `AssetsService` reimplements its own private `scope()` instead of
  extending `TenantScopedRepository` like `TenancyService` does — two
  copies of the same logic that can silently drift apart.
- `assetAuditEvent` documents carry no `tenantId`/`companyId`. Fine
  today since nothing queries the collection directly, but the
  planned "audit query API" (see Next steps) will need those fields
  added before it can be scoped safely.