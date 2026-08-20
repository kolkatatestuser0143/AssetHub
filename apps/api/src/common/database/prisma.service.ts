import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Runs database work with PostgreSQL session-local tenant context.
   * RLS policies read app.tenant_id/app.company_id from current_setting().
   * Keep tenant-scoped work inside this transaction.
   */
  async withTenantContext<T>(
    tenantId: string,
    companyId: string | null,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      if (companyId) {
        await tx.$executeRaw`SELECT set_config('app.company_id', ${companyId}, true)`;
      } else {
        await tx.$executeRaw`SELECT set_config('app.company_id', '', true)`;
      }
      return work(tx);
    });
  }
}
