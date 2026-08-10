import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthContext } from '../../src/common/guards/tenant-context.guard';

/**
 * Creates two fully separate tenants (A and B), each with one company,
 * one user, and one asset type — the minimum needed to attempt a
 * cross-tenant read/write and prove it's blocked. Every isolation test
 * in this suite should be built on top of this fixture rather than a
 * bespoke setup, so the "shape" of what's being isolated stays
 * consistent and easy to extend as new tenant-owned tables are added.
 */
export async function seedTwoTenants(prisma: PrismaClient) {
  const [tenantA, tenantB] = await Promise.all([
    prisma.tenant.create({ data: { name: 'Tenant A', slug: `tenant-a-${Date.now()}` } }),
    prisma.tenant.create({ data: { name: 'Tenant B', slug: `tenant-b-${Date.now()}` } }),
  ]);

  const [companyA, companyB] = await Promise.all([
    prisma.company.create({ data: { tenantId: tenantA.id, name: 'Company A', code: 'AAA' } }),
    prisma.company.create({ data: { tenantId: tenantB.id, name: 'Company B', code: 'BBB' } }),
  ]);

  const passwordHash = await argon2.hash('TestPassword123!', { type: argon2.argon2id });
  const [userA, userB] = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenantA.id,
        companyId: companyA.id,
        email: `user-a-${Date.now()}@example.com`,
        passwordHash,
        firstName: 'A',
        lastName: 'User',
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenantB.id,
        companyId: companyB.id,
        email: `user-b-${Date.now()}@example.com`,
        passwordHash,
        firstName: 'B',
        lastName: 'User',
      },
    }),
  ]);

  const [assetTypeA, assetTypeB] = await Promise.all([
    prisma.assetType.create({
      data: { companyId: companyA.id, name: 'Laptop', numberingRule: { create: { prefix: 'LAP' } } },
    }),
    prisma.assetType.create({
      data: { companyId: companyB.id, name: 'Laptop', numberingRule: { create: { prefix: 'LAP' } } },
    }),
  ]);

  const authA: AuthContext = {
    userId: userA.id,
    tenantId: tenantA.id,
    companyId: companyA.id,
    crossCompany: false,
    permissions: ['asset:read', 'asset:write', 'company:read', 'company:write'],
  };
  const authB: AuthContext = {
    userId: userB.id,
    tenantId: tenantB.id,
    companyId: companyB.id,
    crossCompany: false,
    permissions: ['asset:read', 'asset:write', 'company:read', 'company:write'],
  };

  return { tenantA, tenantB, companyA, companyB, userA, userB, assetTypeA, assetTypeB, authA, authB };
}

export async function cleanupTenants(prisma: PrismaClient, tenantIds: string[]) {
  // Delete in FK-safe order. In a larger suite this belongs in a shared
  // test-teardown util once more tenant-owned tables exist.
  await prisma.assetAuditEvent.deleteMany({ where: { asset: { tenantId: { in: tenantIds } } } });
  await prisma.asset.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.assetNumberingRule.deleteMany({ where: { assetType: { company: { tenantId: { in: tenantIds } } } } });
  await prisma.assetType.deleteMany({ where: { company: { tenantId: { in: tenantIds } } } });
  await prisma.userRole.deleteMany({ where: { user: { tenantId: { in: tenantIds } } } });
  await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
}
