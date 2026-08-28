import * as argon2 from 'argon2';
import { PrismaService } from '../../src/common/database/prisma.service';
import { AuthContext } from '../../src/common/guards/tenant-context.guard';

export interface TestDb {
  db: PrismaService;
  disconnect(): Promise<void>;
  clearTestCollections(): Promise<void>;
}

export async function connectTestDb(): Promise<TestDb> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must point at a disposable PostgreSQL test database');
  const db = new PrismaService();
  await db.$connect();
  return {
    db,
    disconnect: () => db.$disconnect(),
    clearTestCollections: async () => {
      await db.$executeRawUnsafe('TRUNCATE TABLE tenants CASCADE');
    },
  };
}

export async function seedTwoTenants(db: PrismaService) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: `tenant-a-${suffix}` } });
  const tenantB = await db.tenant.create({ data: { name: 'Tenant B', slug: `tenant-b-${suffix}` } });
  const companyA = await db.company.create({ data: { tenantId: tenantA.id, name: 'Company A', code: `AAA${suffix}` } });
  const companyB = await db.company.create({ data: { tenantId: tenantB.id, name: 'Company B', code: `BBB${suffix}` } });
  const passwordHash = await argon2.hash('TestPassword123!', { type: argon2.argon2id });
  const userA = await db.user.create({ data: { tenantId: tenantA.id, companyId: companyA.id, email: `user-a-${suffix}@example.com`, passwordHash, firstName: 'A', lastName: 'User', authVersion: 0 } });
  const userB = await db.user.create({ data: { tenantId: tenantB.id, companyId: companyB.id, email: `user-b-${suffix}@example.com`, passwordHash, firstName: 'B', lastName: 'User', authVersion: 0 } });
  const assetTypeA = await db.assetType.create({ data: { companyId: companyA.id, name: `Laptop A ${suffix}`, prefix: 'LAP', separator: '-', padding: 6, nextSequence: 1 } });
  const assetTypeB = await db.assetType.create({ data: { companyId: companyB.id, name: `Laptop B ${suffix}`, prefix: 'LAP', separator: '-', padding: 6, nextSequence: 1 } });

  const authA: AuthContext = {
    userId: userA.id,
    sessionId: `test-session-a-${suffix}`,
    tenantId: tenantA.id,
    companyId: companyA.id,
    adminLevel: 'TENANT_ADMIN',
    crossCompany: false,
    permissions: ['asset:read', 'asset:write', 'company:read', 'company:write'],
    forcePasswordReset: false,
    authVersion: 0,
  };
  const authB: AuthContext = {
    userId: userB.id,
    sessionId: `test-session-b-${suffix}`,
    tenantId: tenantB.id,
    companyId: companyB.id,
    adminLevel: 'TENANT_ADMIN',
    crossCompany: false,
    permissions: ['asset:read', 'asset:write', 'company:read', 'company:write'],
    forcePasswordReset: false,
    authVersion: 0,
  };

  return { tenantA, tenantB, companyA, companyB, assetTypeA, assetTypeB, authA, authB };
}
