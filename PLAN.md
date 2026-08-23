# AssetHub Implementation Plan

**Baseline:** `Postgresql`

## Phase 1 — Functional hardening

- Verify every Tenant and System route against its backend controller/service.
- Remove dead buttons and placeholder pages.
- Standardize Create/Edit/Delete/Archive/Suspend/Activate mutation behavior.
- Ensure successful mutations refresh affected data and emit consistent feedback.
- Complete shared form controls and password visibility behavior.
- Standardize skeleton loading and empty/error states.

## Phase 2 — Platform integrity

- Maintain strict tenant isolation.
- Validate RBAC at both controller and service boundaries.
- Validate subscription/entitlement feature gates.
- Keep audit events for security-sensitive mutations.
- Validate session invalidation for password reset/deactivation/suspension flows.

## Phase 3 — UX consistency

- Shared Input/FormField/FormSelect/FormTextarea/PasswordInput.
- Shared Button, Modal, ConfirmDialog, Toast and LoadingSkeleton.
- Consistent search and filter behavior; debounce network-backed queries.
- Consistent navigation, responsive behavior and accessibility.
- Tenant license-based theme and System theme consistency.

## Phase 4 — Test hardening

- API unit tests for authorization-sensitive services.
- Integration tests for core Tenant CRUD and System administration flows.
- Frontend smoke tests for critical routes.
- Mutation-state tests: loading, error, success and stale-data refresh.
- Regression coverage for modal focus/cursor and form-submit behavior.

## Phase 5 — Release readiness

- Review Prisma migrations.
- Validate production environment variables.
- Run API and web builds.
- Run migration status/deploy checks against the deployment database.
- Execute smoke-test checklist.
- Review security, logging, monitoring and rollback procedure.

## Current priority order

1. Backend/frontend contract verification.
2. Security and authorization verification.
3. Route-level regression testing.
4. Production deployment validation.
5. Additional UX polish only after functional stability.
