# AssetHub Product Requirements Document

**Status:** Living document  
**Branch baseline:** `Postgresql`  
**Product:** AssetHub multi-tenant asset management platform

## 1. Product purpose

AssetHub provides a single operational system for organizations to manage physical assets, ownership, assignment, lifecycle, organization structure, users, identity integration, reporting, auditability and subscription-controlled capabilities.

The product has two administrative planes:

- **Tenant Console:** daily asset and organization operations for one customer environment.
- **System Admin Console:** platform-level tenant, subscription, plan, user, role, security and operational control.

## 2. Primary personas

### Tenant Administrator
Owns tenant configuration, users, organization structure, asset operations, identity integrations and reporting.

### Tenant Employee / Operator
Uses the tenant workspace for permitted operational tasks and asset workflows according to tenant RBAC.

### System Administrator
Creates and manages tenants, subscriptions, plans, platform users, platform roles, tenant access and platform security.

## 3. Core capabilities

### Tenant asset management
- Asset inventory and Asset 360.
- Asset types and numbering.
- Asset creation/import.
- Assignment and transfers.
- Lifecycle transitions.
- Labels and reports.
- Warranties and audit history.

### Tenant organization
- Companies.
- Sites/plants/offices.
- Locations.
- Departments/business units.
- Organization hierarchy exploration.

### Tenant identity and access
- Tenant users and employees.
- Tenant roles.
- SSO provider management.
- SCIM token management and logs when licensed.
- Password/access management.

### System administration
- Tenant provisioning.
- Tenant 360.
- Subscription and plan management.
- Platform users and roles.
- Platform security, audit, analytics, health and operations.

## 4. Product principles

1. **Backend is authoritative.** UI actions must resolve to real API contracts.
2. **Tenant isolation is mandatory.** Tenant users operate only within authorized tenant scope.
3. **Auditability over destructive convenience.** Lifecycle operations prefer suspend, deactivate, archive or revoke where appropriate.
4. **Shared UI behavior.** Inputs, password fields, dialogs, buttons, loading states, confirmations and notifications use shared components.
5. **License-driven capability.** Subscription entitlements control optional features and tenant theme behavior.
6. **Simple notifications.** Notifications should be useful and deduplicated without becoming a second workflow engine.

## 5. Non-functional requirements

- PostgreSQL persistence through Prisma.
- NestJS API with explicit authorization boundaries.
- Next.js web application with separate Tenant and System routing.
- Responsive desktop-first UI with mobile-safe controls.
- Consistent loading, empty, error and success states.
- Search/filter requests must be debounced when they trigger backend requests.
- Mutations must prevent double submission and refresh affected data.
- Security-sensitive events must be auditable.

## 6. UX acceptance criteria

Every interactive page must provide:

- clear primary action;
- shared form controls;
- visible focus/caret behavior;
- disabled/loading state during mutations;
- shared confirmation for destructive actions;
- shared skeleton loading for data loading;
- empty and error states;
- success/error feedback;
- consistent navigation and back-to-top behavior where needed.

## 7. Future scope

Potential future capabilities include advanced MFA, deeper workflow automation, richer notification channels, expanded analytics and broader integrations. These are future scope unless explicitly implemented and tracked in the roadmap.

## 8. Definition of done

A feature is done only when backend contract, authorization, frontend interaction, loading/error states, audit behavior, tests and documentation are updated together.
