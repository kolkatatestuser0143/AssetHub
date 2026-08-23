# AssetHub Security Baseline

## Security objectives

AssetHub must protect tenant data, administrative control, credentials, sessions, licensing state and audit records.

## Authentication

Authentication is handled by the API/session layer. Tenant and System Admin login paths are separate and must remain explicitly scoped.

Password operations must support secure temporary-password handling, password change requirements and session invalidation where appropriate.

## Authorization

Authorization is enforced server-side. The frontend may hide or disable controls for usability, but that is not a security boundary.

Every protected mutation must validate the authenticated principal, role/permission and tenant/platform scope.

## Tenant isolation

A tenant user must not be able to access or mutate another tenant by changing URL parameters or request payloads. System Admin cross-tenant capabilities are explicitly permission-controlled.

## CSRF and session security

State-changing requests must use the application's configured CSRF/session protection. If CSRF initialization fails, the API should fail closed rather than silently accepting the mutation.

Session revocation is required for sensitive account operations such as administrator password reset, user deactivation and tenant suspension when defined by business rules.

## Secrets

Never commit `.env` files or live credentials. `.env.example` documents expected configuration without exposing secrets.

SCIM tokens, temporary passwords, private keys and signing secrets must not be written to ordinary application logs.

## Billing/license security

Subscription/license information is security-sensitive because it controls feature entitlement. Feature gates must be enforced server-side in addition to UI gating.

## Auditability

Security-sensitive operations should be auditable, including authentication events, role changes, subscription changes, tenant lifecycle changes, user access changes and token/session operations.

## Input validation

Validate and normalize request payloads at the API boundary. Treat JSON configuration, identity-provider configuration, import data and search parameters as untrusted input.

## Production checklist

- TLS enforced at the edge.
- Production secrets injected securely.
- Database credentials least-privileged.
- CORS restricted to approved origins.
- Rate limits applied to authentication and sensitive endpoints.
- Security headers enabled.
- Logs monitored without credential leakage.
- Prisma migrations reviewed before deployment.
