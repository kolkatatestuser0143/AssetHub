import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { UserAccountType } from '../../models/user.schemas';
import { TenantStatus } from '../../models/tenancy.schemas';
import { toDto } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';

const ACCESS_TOKEN_TTL = '10m';
const DEFAULT_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private readonly db: MongooseDatabaseService, private readonly jwt: JwtService, private readonly entitlements: EntitlementService) {}

  async issueSession(userId: string, ip: string, userAgent: string, system = false) {
    const rawUser = await this.db.findByIdOrThrow<any>(this.db.user, userId, 'User');
    const normalizedUserId = String(rawUser._id ?? rawUser.id);
    if (system && rawUser.accountType !== UserAccountType.SYSTEM) throw new UnauthorizedException('System session requires a system account');
    if (!system && rawUser.accountType !== UserAccountType.TENANT) throw new UnauthorizedException('Tenant session requires a tenant account');

    let refreshTokenTtlMs = DEFAULT_REFRESH_TOKEN_TTL_MS;
    if (!system) {
      const tenant = await this.db.tenant.findById(rawUser.tenantId).select({ status: 1 }).lean();
      if (!tenant) throw new UnauthorizedException('Tenant account is unavailable');
      if (tenant.status === TenantStatus.SUSPENDED) throw new UnauthorizedException('Tenant account is suspended');
      if (tenant.status === TenantStatus.ARCHIVED) throw new UnauthorizedException('Tenant account is archived');
      const maxSessionDays = await this.entitlements.getNumber(rawUser.tenantId, 'session_max_days');
      if (maxSessionDays !== null) refreshTokenTtlMs = maxSessionDays * 24 * 60 * 60 * 1000;
      if (refreshTokenTtlMs <= 0) throw new ForbiddenException('Tenant session policy is invalid');
      const maxConcurrent = await this.entitlements.getNumber(rawUser.tenantId, 'max_concurrent_sessions');
      if (maxConcurrent !== null) {
        const activeSessions = await this.db.session.find({ userId: normalizedUserId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ lastSeenAt: 1, createdAt: 1 }).lean();
        const overflow = activeSessions.length - maxConcurrent + 1;
        if (overflow > 0) await this.db.session.updateMany({ _id: { $in: activeSessions.slice(0, overflow).map((session: any) => session._id) }, userId: normalizedUserId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'concurrent_session_limit' } });
      }
    }

    const permissions = system ? await this.resolveSystemPermissions(rawUser.roleIds ?? []) : await this.resolvePermissions(rawUser.tenantId, rawUser.companyId, rawUser.roleIds ?? []);
    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const session = await this.db.session.create({ userId: normalizedUserId, refreshTokenHash: this.hashToken(rawRefreshToken), ipAddress: ip, userAgent, lastSeenAt: new Date(), expiresAt: new Date(Date.now() + refreshTokenTtlMs) });
    const sessionId = String(session._id);
    const claims: Record<string, any> = { sub: normalizedUserId, sessionId, permissions, accountType: rawUser.accountType };
    if (system) claims.systemAdmin = true;
    else {
      claims.tenantId = rawUser.tenantId;
      claims.companyId = rawUser.companyId;
      claims.forcePasswordReset = rawUser.forcePasswordReset === true;
    }
    const accessToken = this.jwt.sign(claims, { expiresIn: ACCESS_TOKEN_TTL });
    return { accessToken, refreshToken: rawRefreshToken, sessionId, accountType: rawUser.accountType, forcePasswordReset: !system && rawUser.forcePasswordReset === true };
  }

  async isSystemUser(userId: string): Promise<boolean> {
    const user = await this.db.user.findOne({ _id: userId }).select({ accountType: 1 }).lean();
    return user?.accountType === UserAccountType.SYSTEM;
  }

  async revokeSession(sessionId: string, userId: string, reason: string) {
    await this.db.session.updateOne({ _id: sessionId, userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: reason } });
  }

  async findByRefreshToken(rawRefreshToken: string) { const doc = await this.db.session.findOne({ refreshTokenHash: this.hashToken(rawRefreshToken) }).lean(); return doc ? toDto(doc) : null; }
  hashToken(raw: string): string { return crypto.createHash('sha256').update(raw).digest('hex'); }

  private async resolvePermissions(tenantId: string, companyId: string, roleIds: string[]): Promise<string[]> {
    if (roleIds.length === 0) return [];
    const roles = await this.db.role.find({ _id: { $in: roleIds }, tenantId, $or: [{ companyId }, { companyId: null }] }).lean();
    const perms = new Set<string>();
    for (const role of roles) for (const rp of role.permissions ?? []) perms.add(rp.permissionKey);
    return [...perms];
  }

  private async resolveSystemPermissions(roleIds: string[]): Promise<string[]> {
    if (!roleIds.length) return [];
    const roles = await this.db.role.find({ _id: { $in: roleIds } }).lean();
    const perms = new Set<string>();
    for (const role of roles) for (const rp of role.permissions ?? []) perms.add(rp.permissionKey);
    return [...perms];
  }
}
