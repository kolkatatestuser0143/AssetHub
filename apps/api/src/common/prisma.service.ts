import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps PrismaClient so every query inside a request runs with the
 * Postgres session variable app.tenant_id set — this is what the RLS
 * policies (see prisma/migrations/xxxx_rls_policies.sql) key off of.
 *
 * Application-level filtering (see TenantScopedRepository) is the
 * FIRST line of defense. RLS is the backstop. Neither is optional —
 * see architecture doc §5 (Multi-Tenant Strategy).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs `fn` inside a transaction with app.tenant_id (and optionally
   * app.company_id) set for the duration, so RLS policies apply.
   * Every request-handling code path MUST go through this — never
   * use `this` (the raw client) directly for tenant-owned data.
   */
  async withTenantContext<T>(
    tenantId: string,
    companyId: string | null,
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // set_config(..., true) scopes the setting to the current transaction
      // (equivalent to SET LOCAL) but is parameterized — never interpolate
      // tenantId/companyId directly into SQL.
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      if (companyId) {
        await tx.$executeRaw`SELECT set_config('app.company_id', ${companyId}, true)`;
      }
      return fn(tx as PrismaClient);
    });
  }
}
