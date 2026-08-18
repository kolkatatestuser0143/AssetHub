import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { SessionService } from './session.service';
import { toDto } from '../../common/mongoose.utils';
import { UserAccountType } from '../../models/user.schemas';
import { TenantStatus } from '../../models/tenancy.schemas';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly db: MongooseDatabaseService, private readonly sessions: SessionService) {}
  async hashPassword(plain: string): Promise<string> { return argon2.hash(plain, { type: argon2.argon2id }); }

  async login(email: string, password: string, ip: string, userAgent: string, tenantSlug?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    let userDoc: any;
    const slug = tenantSlug?.trim().toLowerCase();
    if (slug) {
      const tenant = await this.db.tenant.findOne({ slug }).select({ _id: 1, status: 1 }).lean();
      if (!tenant) throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      if (tenant.status !== TenantStatus.ACTIVE) {
        if (tenant.status === TenantStatus.SUSPENDED) throw new UnauthorizedException('This tenant is suspended. Please contact your system administrator.');
        if (tenant.status === TenantStatus.ARCHIVED) throw new UnauthorizedException('This tenant is archived and cannot be accessed.');
        throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      }
      userDoc = await this.db.user.findOne({ email: normalizedEmail, accountType: UserAccountType.TENANT, tenantId: String(tenant._id) }).lean();
    } else {
      if (process.env.REQUIRE_TENANT_HOST === 'true' && process.env.NODE_ENV === 'production') throw new UnauthorizedException('Tenant login domain is required');
      userDoc = await this.db.user.findOne({ email: normalizedEmail, accountType: UserAccountType.TENANT }).lean();
    }
    const user = userDoc ? toDto(userDoc) : null;
    if (user?.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_locked'); throw new UnauthorizedException('Account temporarily locked. Try again later.'); }
    if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) { await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_credentials'); if (user?.id) await this.registerFailedLogin(user.id); throw new UnauthorizedException('Invalid email or password'); }
    if (!user.isActive) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive'); throw new UnauthorizedException('Account is inactive'); }
    if (user.tenantId) {
      const tenant = await this.db.tenant.findById(user.tenantId).select({ status: 1 }).lean();
      if (!tenant) throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      if (tenant.status !== TenantStatus.ACTIVE) {
        if (tenant.status === TenantStatus.SUSPENDED) throw new UnauthorizedException('This tenant is suspended. Please contact your system administrator.');
        if (tenant.status === TenantStatus.ARCHIVED) throw new UnauthorizedException('This tenant is archived and cannot be accessed.');
        throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      }
    }
    await this.clearFailedLogins(user.id);
    await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
    return this.sessions.issueSession(user.id, ip, userAgent, false);
  }

  async systemLogin(email: string, password: string, ip: string, userAgent: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const userDoc = await this.db.user.findOne({ email: normalizedEmail, accountType: UserAccountType.SYSTEM }).lean();
    const user = userDoc ? toDto(userDoc) : null;
    if (user?.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_locked'); throw new UnauthorizedException('Account temporarily locked. Try again later.'); }
    if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) { await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_system_credentials'); if (user?.id) await this.registerFailedLogin(user.id); throw new UnauthorizedException('Invalid system administrator credentials'); }
    if (!user.isActive) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive'); throw new UnauthorizedException('System administrator account is inactive'); }
    const permissions = await this.resolveSystemPermissions(user.roleIds ?? []);
    if (!permissions.includes('platform:console:access')) { await this.recordLoginAttempt(user.id, false, ip, userAgent, 'missing_console_permission'); throw new UnauthorizedException('Account is not permitted to access the system console'); }
    await this.clearFailedLogins(user.id); await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
    return this.sessions.issueSession(user.id, ip, userAgent, true);
  }

  async changeTenantPassword(userId: string, currentPassword: string | undefined, newPassword: string, currentSessionId: string, ip: string, userAgent: string) {
    if (!currentSessionId) throw new UnauthorizedException('Active tenant session is required');
    if (!newPassword || newPassword.length < 12) throw new BadRequestException('Password must be at least 12 characters');
    const user = await this.db.user.findOne({ _id: userId, accountType: 'TENANT' }).lean();
    if (!user?.passwordHash) throw new UnauthorizedException('Tenant account not found');
    if (!user.forcePasswordReset && currentPassword && !(await argon2.verify(user.passwordHash, currentPassword))) throw new UnauthorizedException('Current password is incorrect');
    if (!user.forcePasswordReset && !currentPassword) throw new BadRequestException('Current password is required');
    if (await argon2.verify(user.passwordHash, newPassword)) throw new BadRequestException('New password must be different from the current password');
    const passwordHash = await this.hashPassword(newPassword);
    await this.db.user.updateOne({ _id: user._id }, { $set: { passwordHash, forcePasswordReset: false, updatedAt: new Date(), failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 }, $inc: { authVersion: 1 } });
    await this.db.session.updateMany({ userId: String(user._id), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'password_changed' } });
    await this.db.auditEvent.create({ tenantId: user.tenantId, companyId: user.companyId, actorUserId: String(user._id), action: 'auth.password_changed', targetType: 'user', targetId: String(user._id), result: 'success', occurredAt: new Date() });
    const session = await this.sessions.issueSession(String(user._id), ip, userAgent, false);
    return { ok: true, mustChangePassword: false, ...session };
  }

  async refresh(rawRefreshToken: string, ip: string, userAgent: string) { return this.sessions.rotateRefreshToken(rawRefreshToken, ip, userAgent); }
  async logout(sessionId: string, userId: string) { await this.sessions.revokeSession(sessionId, userId, 'user_logout'); }
  async logoutByRefreshToken(rawRefreshToken: string) { const session = await this.sessions.findByRefreshToken(rawRefreshToken); if (session && !session.revokedAt) await this.sessions.revokeSession(session.id, session.userId, 'user_logout'); }

  private async registerFailedLogin(userId: string) { const now = new Date(); const user = await this.db.user.findById(userId).select({ failedLoginAttempts: 1, lockedUntil: 1 }).lean(); if (!user) return; if (user.lockedUntil && new Date(user.lockedUntil).getTime() <= now.getTime()) { await this.db.user.updateOne({ _id: userId }, { $set: { failedLoginAttempts: 1 }, $unset: { lockedUntil: 1 } }); return; } const attempts = Number(user.failedLoginAttempts ?? 0) + 1; if (attempts >= MAX_FAILED_LOGINS) await this.db.user.updateOne({ _id: userId }, { $set: { failedLoginAttempts: attempts, lockedUntil: new Date(now.getTime() + LOCKOUT_MS) } }); else await this.db.user.updateOne({ _id: userId }, { $set: { failedLoginAttempts: attempts } }); }
  private async clearFailedLogins(userId: string) { await this.db.user.updateOne({ _id: userId }, { $set: { failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 } }); }
  private async resolveSystemPermissions(roleIds: string[]): Promise<string[]> { if (!roleIds.length) return []; const normalizedIds = roleIds.map((id) => String(id)); const objectIds = normalizedIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)); const filters: Record<string, unknown>[] = [{ _id: { $in: normalizedIds } }]; if (objectIds.length) filters.push({ _id: { $in: objectIds } }); const roles = await this.db.role.find({ $or: filters }).lean(); const perms = new Set<string>(); for (const role of roles) for (const permission of role.permissions ?? []) if (permission.permissionKey) perms.add(permission.permissionKey); return [...perms]; }
  private async recordLoginAttempt(userId: string | null, success: boolean, ip: string, userAgent: string, reason: string | null) { if (!userId) return; await this.db.loginHistory.create({ userId, success, ipAddress: ip, userAgent, reason: reason ?? undefined, occurredAt: new Date() }); }
}
