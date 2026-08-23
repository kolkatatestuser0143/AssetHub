# AssetHub RBAC Guide

## Two authorization planes

### Tenant RBAC
Controls what a user can do inside one tenant: asset operations, organization management, users, roles, identity administration, reports and configuration.

### System RBAC
Controls platform administration: tenant provisioning, plans, subscriptions, platform users, platform roles, security and operational controls.

## Principles

- Permissions are authoritative on the API.
- Built-in/system roles are protected from unsafe modification.
- Custom roles can be managed according to backend business rules.
- Role changes should be auditable.
- UI visibility is not an authorization boundary.

## Permission naming

Platform permissions use a stable key namespace. New permissions should follow a predictable resource/action convention and be exposed through the backend permissions endpoint before being consumed by the role editor.

## Role lifecycle

For custom roles:

```text
Create → Edit → Assign → Remove/Archive/Delete
```

Deletion should be prevented while a role is still assigned when the backend requires reassignment first.

## Platform users

System Admin user management supports creating users, editing profile data, assigning roles, changing status and resetting passwords. Sensitive operations should revoke or invalidate sessions when required.

## Authorization tests

For every protected mutation test:

1. authorized principal succeeds;
2. authenticated but unauthorized principal receives a denial;
3. unauthenticated request is rejected;
4. tenant-scoped principal cannot cross tenant boundary;
5. built-in protected role cannot be mutated through custom-role routes.
