# AssetHub Feature Matrix

Legend: ✅ implemented/baseline, 🟡 read-only or intentionally limited, 🔵 future/extension.

| Area | Tenant | System | Status |
|---|---:|---:|---|
| Authentication | ✅ | ✅ | Separate login/control paths |
| Assets | ✅ | — | Inventory and lifecycle |
| Asset 360 | ✅ | — | Detailed asset view |
| Asset import | ✅ | — | Dedicated import flow |
| Assignments/transfers | ✅ | — | Operational workflows |
| Asset reports/labels | ✅ | — | Reporting/labels |
| Companies/sites/locations/departments | ✅ | — | Organization hierarchy |
| Vendors | ✅ | — | CRUD |
| Employees/users | ✅ | ✅ platform users | Different authorization planes |
| Tenant roles | ✅ | — | Tenant RBAC |
| Platform roles | — | ✅ | System RBAC |
| SSO | ✅ | — | Tenant identity |
| SCIM | ✅ when licensed | — | Feature gated |
| Custom fields | ✅ | — | Tenant configuration |
| Warranties | ✅ | — | Asset support |
| Audit | ✅ | ✅ | Read-focused operational/security views |
| Plans | — | ✅ | System Admin |
| Subscriptions | — | ✅ | System Admin |
| Entitlements | ✅ effective view | ✅ management | Licensing |
| Tenant 360 | — | ✅ | Platform control plane |
| Security | ✅ tenant context | ✅ platform | Security/session controls |
| Analytics | ✅ reporting | ✅ platform analytics | Read-focused |
| Health/operations | — | ✅ | System control plane |
| Notifications | ✅ | ✅ | Simple in-app model |

## Release acceptance

A feature marked implemented must have a real backend contract, authorization, successful/failed mutation handling where applicable, loading/empty/error states and documentation coverage.
