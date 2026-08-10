import { AuthContext } from './guards/tenant-context.guard';
import { PrismaService } from './prisma.service';

/**
 * Every module's repository extends this. It's the FIRST line of
 * defense in the chain described in architecture doc §5 — RLS is the
 * backstop, not the primary mechanism, because relying on RLS alone
 * makes bugs invisible until a policy is misconfigured.
 *
 * Concrete repositories must call `this.scope(auth)` and merge the
 * result into every `where` clause. This is intentionally explicit
 * rather than magic, so a missing scope() call is visible in review.
 */
export abstract class TenantScopedRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected scope(auth: AuthContext): { tenantId: string; companyId?: string } {
    if (auth.crossCompany) {
      return { tenantId: auth.tenantId };
    }
    return { tenantId: auth.tenantId, companyId: auth.companyId };
  }
}
