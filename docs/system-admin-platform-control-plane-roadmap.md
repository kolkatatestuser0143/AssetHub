# AssetHub System Admin Platform Control Plane

## Purpose

Define the production-grade System Admin control plane without coupling it to tenant UI state or tenant branding.

## P0 — Core platform operations

### Tenant lifecycle
- Create tenant through a guided provisioning workflow.
- Configure company name, tenant login email, subscription, branding and initial administrator.
- Generate a temporary password and force password change on first login.
- Reset tenant administrator password from System Admin.
- Suspend/reactivate tenants with mandatory reason and audit trail.
- Revoke tenant sessions when required.
- Preserve tenant status history and internal support notes.

### Licensing and entitlements
- Manage plans and plan limits.
- Manage feature entitlements independently from platform feature flags.
- Display effective entitlement for every tenant.
- Show the source of every entitlement: plan, tenant override, or platform state.
- Explain disabled features with a human-readable reason.
- Track subscription lifecycle: TRIAL, ACTIVE, PAST_DUE, SUSPENDED, EXPIRED, CANCELLED.
- Track subscription changes and expiration/grace periods.

### Platform identity and RBAC
- Manage System Admin users.
- Create, disable and reset platform administrators.
- Force password changes and revoke sessions.
- Provide granular platform permissions for tenant, billing, security, support and system operations.
- Keep System Admin authorization separate from tenant authorization.

### Global search
- Ctrl/Cmd+K command palette.
- Search tenants, platform users, tenant users, assets, subscriptions, plans and audit events.
- Provide direct actions for common operations.

### Jobs and operations
- Expose background job queues, running jobs, failures and dead-letter jobs.
- Retry/cancel jobs according to permission.
- Show job history and correlation/request IDs.

### System health
- API, database, Redis, storage, email, licensing and job health.
- Latency, error rate, queue depth and health history.
- Never expose secrets in health responses.

## P1 — Enterprise operations

### Security
- Active sessions and session revocation.
- Login history and failed-login investigation.
- Security event summaries.
- API keys with scopes, expiration, last-used and revocation.
- Rate-limit visibility and abuse signals.

### Audit
- Search/filter by tenant, actor, action, resource, status, IP and date range.
- Event detail with request ID and metadata.
- Export audit records with authorization and audit trail.

### Support
- Tenant support center showing health, subscription, usage, recent errors and activity.
- Explicit support/impersonation mode with persistent banner and complete auditing.

### Storage and email
- Provider-neutral storage abstraction.
- Storage health, failed uploads and usage.
- Transactional email provider health, delivery failures and template management.

### Notifications
- Platform notification center.
- Security alerts, failed jobs, subscription warnings, storage warnings and tenant lifecycle events.

### Analytics
- Tenant growth, active tenants, suspended tenants and churn.
- Platform users/assets/documents/storage/API usage.
- Subscription distribution and lifecycle metrics.

### Webhooks
- Platform webhook endpoints and event subscriptions.
- Signed delivery, retry, replay and delivery history.

## P2 — Resilience and governance

### Maintenance
- Scheduled maintenance windows.
- Tenant-facing maintenance message.
- Allow System Admin access during maintenance.

### Incidents
- Incident lifecycle: investigating, identified, monitoring, resolved.
- Affected tenant visibility.
- Timeline and internal notes.

### Backups and recovery
- Database/configuration backup status.
- Retention and backup history.
- Controlled restore workflow with elevated authorization and auditing.

### Data governance
- Retention policies for audit, login history, sessions and jobs.
- Tenant export/deletion workflows.
- Compliance activity audit.

### Platform feature flags
- Separate global rollout flags from license entitlements.
- Support gradual enablement without changing subscription semantics.

## UX standards

- Use a clean operations-console style: dense but readable, subtle animation, strong hierarchy and predictable interactions.
- Every asynchronous operation needs loading, success, empty and actionable error states.
- Never expose raw backend exceptions to administrators.
- Destructive actions require confirmation and explain impact.
- Every sensitive System Admin action must be auditable.
- Tenant branding/theme must never leak into System Admin pages.
- Tenant license theme applies only inside tenant context.
- System Admin theme is platform-owned and independent of tenant plan.
- Prefer real backend data over simulated dashboard values.
- Show request/correlation IDs on actionable technical errors.

## Implementation order

1. Tenant lifecycle completion.
2. Effective entitlement debugger.
3. Platform user/RBAC management.
4. Global search/command palette.
5. Background jobs.
6. System health.
7. API keys and rate-limit visibility.
8. Advanced support center.
9. Storage/email administration.
10. Notifications, analytics and webhooks.
11. Maintenance, incidents, backup/recovery and governance.
