import { ForbiddenException } from '@nestjs/common';
import { RbacService } from './rbac.service';

const TENANT_ID = '507f1f77bcf86cd799439011';
const COMPANY_A = 'company-a';
const COMPANY_B = 'company-b';
const ROLE_ID = '507f1f77bcf86cd799439012';
const USER_ID = '507f1f77bcf86cd799439013';

function query<T>(value: T) {
  return {
    lean: jest.fn().mockResolvedValue(value),
  };
}

describe('RbacService tenant/company boundaries', () => {
  const entitlements = { requireFeature: jest.fn().mockResolvedValue(undefined) };
  let db: any;
  let service: RbacService;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      role: { findOne: jest.fn(), find: jest.fn(), create: jest.fn() },
      user: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
      permission: { find: jest.fn() },
    };
    service = new RbacService(db, entitlements as any);
  });

  it('rejects assigning a company-scoped role to a different company even for cross-company admins', async () => {
    db.role.findOne.mockReturnValue(query({ _id: ROLE_ID, tenantId: TENANT_ID, companyId: COMPANY_A }));
    db.user.findOne.mockReturnValue(query({ _id: USER_ID, tenantId: TENANT_ID, companyId: COMPANY_B, accountType: 'TENANT' }));

    await expect(service.assignRole({
      userId: 'actor', sessionId: 'session', tenantId: TENANT_ID, companyId: COMPANY_A,
      crossCompany: true, permissions: ['role:write'], forcePasswordReset: false,
    }, USER_ID, ROLE_ID)).rejects.toBeInstanceOf(ForbiddenException);

    expect(db.user.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('allows a cross-company admin to assign a tenant-global role', async () => {
    db.role.findOne.mockReturnValue(query({ _id: ROLE_ID, tenantId: TENANT_ID, companyId: null }));
    db.user.findOne.mockReturnValue(query({ _id: USER_ID, tenantId: TENANT_ID, companyId: COMPANY_B, accountType: 'TENANT' }));
    db.user.findOneAndUpdate.mockReturnValue(query({ _id: USER_ID, roleIds: [ROLE_ID] }));

    await expect(service.assignRole({
      userId: 'actor', sessionId: 'session', tenantId: TENANT_ID, companyId: COMPANY_A,
      crossCompany: true, permissions: ['role:write'], forcePasswordReset: false,
    }, USER_ID, ROLE_ID)).resolves.toEqual(expect.objectContaining({ _id: USER_ID }));

    expect(db.user.findOneAndUpdate).toHaveBeenCalled();
  });

  it('allows a company admin to assign a role belonging to their company', async () => {
    db.role.findOne.mockReturnValue(query({ _id: ROLE_ID, tenantId: TENANT_ID, companyId: COMPANY_A }));
    db.user.findOne.mockReturnValue(query({ _id: USER_ID, tenantId: TENANT_ID, companyId: COMPANY_A, accountType: 'TENANT' }));
    db.user.findOneAndUpdate.mockReturnValue(query({ _id: USER_ID, roleIds: [ROLE_ID] }));

    await expect(service.assignRole({
      userId: 'actor', sessionId: 'session', tenantId: TENANT_ID, companyId: COMPANY_A,
      crossCompany: false, permissions: ['role:write'], forcePasswordReset: false,
    }, USER_ID, ROLE_ID)).resolves.toEqual(expect.objectContaining({ _id: USER_ID }));
  });
});
