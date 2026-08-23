# AssetHub API Contract Guide

This document is the frontend/backend contract reference. Endpoint names below describe the current product surface and should be kept synchronized with NestJS controllers.

## Tenant core

### Companies / organization

```text
GET    /companies/hierarchy
POST   /companies
PATCH  /companies/:companyId
DELETE /companies/:companyId
POST   /companies/:companyId/sites
PATCH  /companies/sites/:siteId
DELETE /companies/sites/:siteId
POST   /companies/sites/:siteId/locations
PATCH  /companies/locations/:locationId
DELETE /companies/locations/:locationId
POST   /companies/locations/:locationId/departments
PATCH  /companies/departments/:departmentId
DELETE /companies/departments/:departmentId
```

### Assets

The Tenant Assets page uses inventory querying with pagination, search and filters, plus lifecycle transitions and reporting.

```text
GET    /assets
GET    /assets/types
POST   /assets/:assetId/transition
GET    /assets/reports/excel
```

Create/import/assignment/transfer routes are implemented in their dedicated pages and services; keep those contracts documented whenever changed.

### Vendors

```text
POST   /assets/vendors
PATCH  /assets/vendors/:vendorId
DELETE /assets/vendors/:vendorId
```

### Tenant users

Tenant user management includes user list/create/edit/role/status/access flows. Any newly exposed mutation must have a matching protected controller endpoint.

## Identity / SCIM

```text
GET    /companies
GET    /identity-admin/:companyId/providers
POST   /identity-providers/:companyId
PATCH  /identity-admin/:companyId/providers/:providerId/enable
PATCH  /identity-admin/:companyId/providers/:providerId/disable
GET    /identity-admin/:companyId/scim/tokens
POST   /identity-admin/:companyId/scim/tokens
PATCH  /identity-admin/:companyId/scim/tokens/:tokenId/revoke
GET    /identity-admin/:companyId/scim/logs
```

SCIM controls are feature-gated by tenant subscription capability.

## System Admin

### Tenants

```text
GET    /system/tenants
POST   /system/tenants
POST   /system/tenants/:tenantId/reset-password
PATCH  /system/tenants/:tenantId/suspend
PATCH  /system/tenants/:tenantId/activate
GET    /system/tenants/:tenantId/360
```

### Roles

```text
GET    /system/roles
GET    /system/roles/permissions
POST   /system/roles
PATCH  /system/roles/:roleId
DELETE /system/roles/:roleId
```

Built-in roles remain protected by service/business rules.

### Platform users

```text
POST   /system/users
PATCH  /system/users/:userId
PATCH  /system/users/:userId/roles
PATCH  /system/users/:userId/status
POST   /system/users/:userId/reset-password
```

### Subscriptions

```text
GET    /system/subscriptions
PATCH  /system/subscriptions/:tenantId
POST   /system/subscriptions/:tenantId/renew
PATCH  /system/subscriptions/:tenantId/status
DELETE /system/subscriptions/:tenantId
PATCH  /system/subscriptions/:tenantId/entitlement/:subscriptionId
```

## API implementation rules

1. Controllers validate input and authorization.
2. Services enforce business rules and tenant/platform boundaries.
3. Mutations should be idempotent where practical and must reject invalid transitions.
4. Sensitive mutations must generate appropriate audit/security events.
5. Frontend code must not simulate successful backend mutations by only changing local state.
