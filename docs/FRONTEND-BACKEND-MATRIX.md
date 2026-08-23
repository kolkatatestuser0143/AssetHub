# Frontend ↔ Backend Coverage Matrix

This is the operational checklist for preventing UI controls from becoming decorative or dead.

| Domain | UI surface | Backend contract | State/feedback |
|---|---|---|---|
| Tenant | Assets | `/assets`, lifecycle/report endpoints | loading/error/success |
| Tenant | Companies | company/site/location/department CRUD | loading/error/toast |
| Tenant | Vendors | vendor CRUD | submit/loading/toast |
| Tenant | Employees | user create/promote/status flows | submit/loading/toast |
| Tenant | Users | list/create/edit/roles/status/access flows | loading/error/toast |
| Tenant | Identity | provider + SCIM endpoints | loading/error/success |
| Tenant | Custom Fields | custom-field CRUD | confirm/toast |
| System | Tenants | tenant CRUD/lifecycle/reset endpoints | mutation loading/toast |
| System | Tenant 360 | 360 + suspend/activate/reset endpoints | modal/loading/toast |
| System | Plans | plan CRUD/archive endpoints | modal/loading/toast |
| System | Subscriptions | assign/renew/status/revoke/entitlement | confirm/loading/toast |
| System | Roles | role CRUD + permissions | confirm/loading/toast |
| System | Platform Users | create/edit/roles/status/reset | confirm/loading/toast |
| System | Access Review | users + roles reads | read-only |
| System | Audit | audit read endpoints | read-only |
| System | Analytics | analytics read endpoint | read-only |
| System | Security | session/security actions | mutation/loading |

## Page checklist

For each route confirm:

- visible action has a navigation handler, form submission or API mutation;
- endpoint exists and returns expected data shape;
- authorization is enforced server-side;
- mutation disables the initiating control;
- success refreshes affected data;
- errors are displayed safely;
- destructive action uses `ConfirmDialog`;
- data loading uses shared skeleton;
- search/filter behavior is appropriate to local vs network data.
