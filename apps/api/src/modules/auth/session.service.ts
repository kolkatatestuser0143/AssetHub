import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { UserAccountType } from '../../models/user.schemas';
import { toDto } from '../../common/mongoose.utils';

const ACCESS_TOKEN_TTL = '10m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private readonly db: MongooseDatabaseService, private readonly jwt: JwtService) {}

  async issueSession(userId: string, ip: string, userAgent: string, system = false) {
    const rawUser = await this.db.findByIdOrThrow<any>(this.db.user, userId, 'User');
    if (system && rawUser.accountType !== UserAccountType.SYSTEM) throw new UnauthorizedException('System session requires a system account');
    if (!system && rawUser.accountType !== UserAccountType.TENANT) throw new UnauthorizedException('Tenant session requires a tenant account');

    const permissions = system
      ? await this.resolveSystemPermissions(rawUser.roleIds ?? [])
      : await this.resolvePermissions(rawUser.tenantId, rawUser.companyId, rawUser.roleIds ?? []);

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const session = await this.db.session.create({
      userId: rawUser.id,
      refreshTokenHash: this.hashToken(rawRefreshToken),
      ipAddress: ip,
      userAgent,
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    const sessionId = String(session._id);
    const claims: Record<string, any> = {
      sub: rawUser.id,
      sessionId,
      permissions,
      accountType: rawUser.accountType,
    };
    if (system) claims.systemAdmin = true;
    else {
      claims.tenantId = rawUser.tenantId;
      claims.companyId = rawUser.companyId;
    }

    const accessToken = this.jwt.sign(claims, { expiresIn: ACCESS_TOKEN_TTL });
    return { accessToken, refreshToken: rawRefreshToken, sessionId, accountType: rawUser.accountType };
  }

  async isSystemUser(userId: string): Promise<boolean> {
    const user = await this.db.user.findOne({ _id: userId }).select({ accountType: 1 }).lean();
    return user?.accountType === UserAccountType.SYSTEM;
  }

  async revokeSession(sessionId: string, userId: string, reason: string) {
    await this.db.session.updateOne({ _id: sessionId, userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: reason } });
  }

  async findByRefreshToken(rawRefreshToken: string) {
    const doc = await this.db.session.findOne({ refreshTokenHash: this.hashToken(rawRefreshToken) }).lean();
    return doc ? toDto(doc) : null;
  }

  hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

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
