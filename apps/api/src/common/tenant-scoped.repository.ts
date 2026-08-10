import { AuthContext } from './guards/tenant-context.guard';

/**
 * The ONLY tenant-isolation mechanism in the MongoDB data layer — the
 * safety story is intentionally different from the Postgres original:
 *
 * - Postgres: application-level filter (primary) + RLS (backstop).
 * - MongoDB: application-level filter (the whole defense). MongoDB has
 *   no RLS, so a single missing `scope()` in a query is a full
 *   cross-tenant leak. There is no second layer.
 *
 * Concrete repositories/services must call `this.scope(auth)` and merge
 * the result into every tenant-owned query filter. If you see a query
 * on a tenant-owned collection WITHOUT a scope filter, that is a
 * security bug, not a style choice.
 */
export abstract class TenantScopedRepository {
  protected scope(auth: AuthContext): { tenantId: string; companyId?: string } {
    if (auth.crossCompany) {
      return { tenantId: auth.tenantId };
    }
    // Non-admin users are pinned to their own company — even if a
    // malicious caller passes another companyId in the request body,
    // every service write pre-verifies the parent row belongs to the
    // caller's tenant/company before touching the DB (see services).
    return { tenantId: auth.tenantId, companyId: auth.companyId };
  }
}
