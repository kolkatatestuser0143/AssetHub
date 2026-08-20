# System Admin UI/UX Plan

## Purpose
Keep the System Admin console distinct from organization-facing AssetHub while making platform operations safer, clearer, and easier to operate.

## Existing navigation
- Dashboard
- Analytics
- Tenants
- Platform Users
- Plans
- Subscriptions
- Usage
- Roles & Permissions
- Audit & Security
- Sessions & Security
- System Health
- Background Jobs
- Settings

## P0 improvements

### Organizations
Use **Organizations** as the customer-facing label for the platform's tenant records. Keep `tenant` as an internal/backend term where required.

Organization detail should expose:
- Overview
- Status
- Plan and subscription
- Entitlements
- Usage and limits
- Primary organization administrator
- Recent activity
- Security state
- Lifecycle actions

Lifecycle states: provisioning, active, suspended, deactivated. Destructive actions require confirmation and an audit reason where appropriate.

### Platform users
Keep **Platform Users** distinct from organization Employees. Show role, status, last login, MFA/security state, active sessions, and activity. Support invite, activate/deactivate, role changes, and session revocation subject to platform permissions.

### Audit
Separate audit from general security navigation where practical. Audit records should answer who did what, to which object, when, from where, whether it succeeded, and what changed. Filters should include administrator, organization, action, resource, date, and outcome.

### Security and sessions
Provide explicit views for security events and active sessions. Session revocation and sensitive changes require confirmation and are audited.

### Support access
If support impersonation is implemented, it must be an explicit **Support access** flow rather than an unrestricted "login as" action. Require a reason, use a short-lived session, prevent credential exposure, show a persistent support-session indicator, and audit both entry and exit.

### Dashboard
Prioritize platform health and attention items:
- Organizations
- Active subscriptions
- Usage/limits
- Failed background jobs
- Security alerts
- Service/integration issues
- Recent platform activity

## P1 improvements

### Entitlements
Present entitlements as capabilities available to an organization. Show source (plan/default/override), enabled state, expiration where applicable, and change history. Keep feature-flag mechanics out of ordinary organization workflows.

### Feature flags
Where feature flags already exist, provide safe platform controls for default state, organization override, rollout state, actor, and timestamp. High-impact changes require confirmation and auditing.

### Billing
Plans, subscriptions, and usage should expose subscription status, trial/renewal information, seat usage, limits, consumption, and plan-change history without turning the console into an accounting system unless required.

### Operations
System Health and Background Jobs are appropriate technical terminology for System Admin. Add job status, retry controls where safe, failure details, queue/backlog visibility, last successful run, and duration.

### Platform-wide search
Provide one operator search for organizations, platform users, subscriptions, and other supported platform objects. Results must identify their object type clearly.

### Incidents / notifications
Provide a small operational attention area for service degradation, provider outages, queue backlog, and other platform incidents.

## P2 polish
- Consistent empty, loading, success, warning, and failure states.
- Keyboard navigation and visible focus.
- Responsive behavior across desktop/tablet/mobile.
- Contextual help for dangerous or unfamiliar controls.
- Consistent terminology without leaking raw backend errors, IDs, endpoints, stack traces, or database errors.

## Vocabulary boundary
System Admin may use legitimate operational terminology such as **SCIM, SSO, entitlements, feature flags, subscriptions, background jobs, audit events, and platform users**. Do not blindly apply tenant-facing vocabulary to this console.

Organization-facing UI should remain customer-oriented: **Employees, Assets, Companies, Locations, Roles & permissions, Sign-in & security, Directory sync**.

## Non-goals
Do not duplicate the tenant application inside System Admin. System Admin operates the platform and supports organizations; organization administrators manage their organization's employees, assets, access, and integrations.
