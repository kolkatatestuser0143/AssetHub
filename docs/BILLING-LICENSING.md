# AssetHub Billing and Licensing

## Purpose

Plans and subscriptions determine which platform capabilities are available to a tenant. Licensing affects feature access and tenant theme presentation.

## Core concepts

- **Plan:** reusable commercial capability definition.
- **Subscription:** tenant-specific assignment of a plan and lifecycle dates/status.
- **Entitlement:** effective capability or limit associated with the subscription.
- **Revocation:** removal of an active subscription without deleting tenant history.

## System Admin capabilities

The System Admin console supports tenant license operations including:

- assign/update plan;
- renew subscription;
- change subscription status;
- revoke subscription;
- manage entitlement overrides;
- inspect subscription/tenant 360 information.

## Lifecycle

Recommended state model:

```text
unlicensed → trialing/active → past_due/canceled → revoked
                         ↘ renewed/reactivated
```

The exact transition rules are enforced by the API and must not be implemented only in the UI.

## Feature gating

Optional tenant features such as SCIM are gated by subscription capability. The frontend should explain when a capability is unavailable, while the API remains authoritative.

## Theme behavior

Tenant visual theme is selected according to the licensed plan/theme configuration. Shared components must consume theme variables rather than hard-coded tenant-specific colors where practical.

## Commercial safety

Do not store secrets or payment credentials in plan metadata. Entitlement changes should be auditable and should be protected by System Admin permissions.
