# AssetHub Test Plan

## 1. Build/validation

Run before merge/release:

```text
pnpm install
pnpm --filter api build
pnpm --filter web build
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma migrate status
```

## 2. Authentication

- Tenant login succeeds for active tenant.
- Suspended/archived tenant is denied.
- System login uses the System path.
- Invalid credentials fail safely.
- Password change and reset behavior is correct.
- Session invalidation occurs for defined sensitive operations.

## 3. Tenant smoke tests

### Assets
- Open inventory.
- Search and filter.
- Change lifecycle for one asset.
- Bulk lifecycle.
- Open Asset 360.
- Export report.
- Create/import asset.

### Organization
- Create/edit/delete Company.
- Create/edit/delete Site.
- Create/edit/delete Location.
- Create/edit/delete Department.
- Verify hierarchy refresh.

### Users
- Create user.
- Edit user.
- Assign role.
- Activate/deactivate.
- Access User 360.
- Password/access operation.

### Vendors
- Create vendor.
- Edit vendor.
- Delete vendor with confirmation.
- Verify list refresh.

### Identity
- Select company.
- Create provider.
- Enable/disable provider.
- Create/revoke SCIM token when licensed.
- Review SCIM logs.

## 4. System smoke tests

- Create tenant and receive temporary credentials.
- Reset tenant administrator password.
- Suspend and activate tenant.
- Open Tenant 360.
- Assign/update/renew/revoke subscription.
- Change entitlement.
- Create/edit/delete custom platform role.
- Verify protected built-in role behavior.
- Create/edit platform user.
- Change platform user role/status.
- Reset platform user password.
- Review Access Review, Audit, Analytics, Health and Operations.

## 5. UI regression tests

- Every modal input accepts a full string without cursor/focus loss.
- Every password field exposes the eye toggle.
- Every form submit button is explicitly wired.
- Search does not send excessive requests.
- Skeletons remain centered.
- Destructive operations use custom confirmation dialogs.
- Empty/error/success states render correctly.
- Keyboard focus remains visible.
- Mobile controls remain usable.

## 6. Authorization tests

For each sensitive mutation test authorized, unauthorized and unauthenticated principals. Verify tenant boundaries cannot be crossed by modifying IDs in the request.

## 7. Migration tests

- Migration status is clean before deployment.
- New migration applies on a clean database.
- Existing production-like database can apply the migration without data loss.
- Prisma Client is generated from the same schema used by the API.
