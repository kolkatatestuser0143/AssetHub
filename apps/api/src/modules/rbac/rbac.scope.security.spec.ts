import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RbacService } from './rbac.service';

describe('RbacService scope security', () => {
  const auth = {
    userId: 'user-1',
    sessionId: 'session-1',
    tenantId: 'tenant-1',
    companyId: 'company-1',
    adminLevel: 'TENANT_ADMIN' as const,
    crossCompany: false,
    permissions: [],
    allowedCompanyIds: [],
    allowedLocationIds: [],
    forcePasswordReset: false,
  };

  const entitlements = { requireFeature: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a company scope from another tenant', async () => {
    const prisma: any = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'role-1', companyId: null }]),
      company: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new RbacService(prisma, entitlements as any);

    await expect(service.setRoleScopes(auth, 'role-1', [{ scopeType: 'COMPANY', companyId: 'foreign-company' }]))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a location scope whose company does not match the supplied company', async () => {
    const prisma: any = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'role-1', companyId: null }]),
      location: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'location-1',
          site: { companyId: 'company-2' },
        }),
      },
    };
    const service = new RbacService(prisma, entitlements as any);

    await expect(service.setRoleScopes(auth, 'role-1', [{
      scopeType: 'LOCATION',
      companyId: 'company-1',
      locationId: 'location-1',
    }])).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a tenant-scoped role without requiring company or location identifiers', async () => {
    const prisma: any = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'role-1', companyId: null }])
        .mockResolvedValueOnce([]),
      $transaction: jest.fn(async callback => callback({ $executeRawUnsafe: jest.fn().mockResolvedValue(1) })),
    };
    const service = new RbacService(prisma, entitlements as any);

    await expect(service.setRoleScopes(auth, 'role-1', [{ scopeType: 'TENANT' }])).resolves.toEqual([]);
  });
});
