import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

const USER_ID = '507f1f77bcf86cd799439011';

function lean<T>(value: T) { return { lean: jest.fn().mockResolvedValue(value) }; }

describe('AuthService account lockout', () => {
  let db: any;
  let sessions: any;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      tenant: { findOne: jest.fn() },
      user: { findOne: jest.fn(), findById: jest.fn(), updateOne: jest.fn() },
      loginHistory: { create: jest.fn() },
      role: { find: jest.fn() },
      auditEvent: { create: jest.fn() },
      session: { updateMany: jest.fn() },
    };
    sessions = { issueSession: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', sessionId: 's', accountType: 'TENANT', forcePasswordReset: false }) };
    service = new AuthService(db, sessions);
  });

  it('locks a tenant account after five bad passwords', async () => {
    const passwordHash = await argon2.hash('correct-password');
    db.user.findOne.mockReturnValue(lean({ _id: USER_ID, id: USER_ID, email: 'user@example.com', passwordHash, accountType: 'TENANT', tenantId: 'tenant-1', companyId: 'company-1', isActive: true, failedLoginAttempts: 4 }));
    db.user.findById.mockReturnValue(lean({ failedLoginAttempts: 4 }));

    await expect(service.login('user@example.com', 'wrong-password', '127.0.0.1', 'jest', 'tenant')).rejects.toThrow('Invalid email or password');

    expect(db.user.updateOne).toHaveBeenCalledWith({ _id: USER_ID }, expect.objectContaining({ $set: expect.objectContaining({ failedLoginAttempts: 5, lockedUntil: expect.any(Date) }) }));
  });

  it('rejects an account while locked without verifying the password', async () => {
    const lockedUntil = new Date(Date.now() + 60_000);
    db.user.findOne.mockReturnValue(lean({ _id: USER_ID, id: USER_ID, email: 'user@example.com', passwordHash: 'not-used', accountType: 'TENANT', tenantId: 'tenant-1', companyId: 'company-1', isActive: true, lockedUntil, failedLoginAttempts: 5 }));
    const verifySpy = jest.spyOn(argon2, 'verify');

    await expect(service.login('user@example.com', 'anything', '127.0.0.1', 'jest', 'tenant')).rejects.toThrow('Account temporarily locked');
    expect(verifySpy).not.toHaveBeenCalled();
    expect(db.loginHistory.create).toHaveBeenCalledWith(expect.objectContaining({ reason: 'account_locked', success: false }));
    verifySpy.mockRestore();
  });

  it('clears failed-login state after a successful login', async () => {
    const passwordHash = await argon2.hash('correct-password');
    db.user.findOne.mockReturnValue(lean({ _id: USER_ID, id: USER_ID, email: 'user@example.com', passwordHash, accountType: 'TENANT', tenantId: 'tenant-1', companyId: 'company-1', isActive: true, failedLoginAttempts: 3 }));

    await service.login('user@example.com', 'correct-password', '127.0.0.1', 'jest', 'tenant');

    expect(db.user.updateOne).toHaveBeenCalledWith({ _id: USER_ID }, { $set: { failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 } });
    expect(sessions.issueSession).toHaveBeenCalled();
  });
});
