import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { SessionService } from './session.service';
import { toDto } from '../../common/mongoose.utils';
import { UserAccountType } from '../../models/user.schemas';

@Injectable()
export class AuthService {
  constructor(private readonly db: MongooseDatabaseService, private readonly sessions: SessionService) {}

  async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async login(email: string, password: string, ip: string, userAgent: string) {
    const userDoc = await this.db.user.findOne({ email: email.trim().toLowerCase(), accountType: UserAccountType.TENANT }).lean();
    const user = userDoc ? toDto(userDoc) : null;

    if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_credentials');
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive');
      throw new UnauthorizedException('Account is inactive');
    }

    await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
    return this.sessions.issueSession(user.id, ip, userAgent, false);
  }

  async systemLogin(email: string, password: string, ip: string, userAgent: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const userDoc = await this.db.user.findOne({ email: normalizedEmail, accountType: UserAccountType.SYSTEM }).lean();
    const user = userDoc ? toDto(userDoc) : null;

    if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_system_credentials');
      throw new UnauthorizedException('Invalid system administrator credentials');
    }
    if (!user.isActive) {
      await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive');
      throw new UnauthorizedException('System administrator account is inactive');
    }

    const permissions = await this.resolveSystemPermissions(user.roleIds ?? []);
    if (!permissions.includes('platform:manage_tenants')) {
      await this.recordLoginAttempt(user.id, false, ip, userAgent, 'missing_platform_permission');
      throw new UnauthorizedException('Account is not a system administrator');
    }

    await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
    return this.sessions.issueSession(user.id, ip, userAgent, true);
  }

  async refresh(rawRefreshToken: string, ip: string, userAgent: string) {
    const session = await this.sessions.findByRefreshToken(rawRefreshToken);
    if (!session || session.revokedAt || session.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');
    await this.sessions.revokeSession(session.id, session.userId, 'rotated');
    return this.sessions.issueSession(session.userId, ip, userAgent, await this.sessions.isSystemUser(session.userId));
  }

  async logout(sessionId: string, userId: string) {
    await this.sessions.revokeSession(sessionId, userId, 'user_logout');
  }

  private async resolveSystemPermissions(roleIds: string[]): Promise<string[]> {
    if (!roleIds.length) return [];

    // roleIds are stored as strings on users while Mongo role _id values are
    // normally ObjectIds. Query both representations so seeded and migrated
    // system accounts resolve permissions reliably.
    const normalizedIds = roleIds.map((id) => String(id));
    const objectIds = normalizedIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const filters: Record<string, unknown>[] = [{ _id: { $in: normalizedIds } }];
    if (objectIds.length) filters.push({ _id: { $in: objectIds } });

    const roles = await this.db.role.find({ $or: filters }).lean();
    const perms = new Set<string>();
    for (const role of roles) {
      for (const permission of role.permissions ?? []) {
        if (permission.permissionKey) perms.add(permission.permissionKey);
      }
    }
    return [...perms];
  }

  private async recordLoginAttempt(userId: string | null, success: boolean, ip: string, userAgent: string, reason: string | null) {
    if (!userId) return;
    await this.db.loginHistory.create({ userId, success, ipAddress: ip, userAgent, reason: reason ?? undefined, occurredAt: new Date() });
  }
}
