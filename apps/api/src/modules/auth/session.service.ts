import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { toDto } from '../../common/mongoose.utils';

const ACCESS_TOKEN_TTL = '10m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * The ONE place a session (access + refresh token pair) is minted,
 * regardless of how the user authenticated (password, SAML, OIDC —
 * and eventually SCIM-triggered re-auth). Both AuthService (password
 * login) and IdentityService (SSO callback) depend on this rather
 * than on each other, which is what avoids the circular import.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async issueSession(userId: string, ip: string, userAgent: string) {
    const rawUser = await this.db.findByIdOrThrow<{ id: string; tenantId: string; companyId: string; roleIds: string[] }>(
      this.db.user,
      userId,
      'User',
    );
    const permissions = await this.resolvePermissions(rawUser.roleIds ?? []);
    const accessToken = this.jwt.sign(
      {
        sub: rawUser.id,
        tenantId: rawUser.tenantId,
        companyId: rawUser.companyId,
        permissions,
      },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const session = await this.db.session.create({
      userId: rawUser.id,
      refreshTokenHash: this.hashToken(rawRefreshToken),
      ipAddress: ip,
      userAgent,
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    return { accessToken, refreshToken: rawRefreshToken, sessionId: String(session._id) };
  }

  async revokeSession(sessionId: string, reason: string) {
    await this.db.session.updateOne(
      { _id: sessionId },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  }

  async findByRefreshToken(rawRefreshToken: string) {
    const doc = await this.db.session
      .findOne({ refreshTokenHash: this.hashToken(rawRefreshToken) })
      .lean();
    return doc ? toDto(doc) : null;
  }

  hashToken(raw: string): string {
    // Refresh tokens are hashed at rest, same principle as passwords —
    // a DB read alone should never yield a usable token.
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async resolvePermissions(roleIds: string[]): Promise<string[]> {
    if (roleIds.length === 0) return [];
    const roles = await this.db.role
      .find({ _id: { $in: roleIds } })
      .lean();
    const perms = new Set<string>();
    for (const role of roles) {
      for (const rp of role.permissions ?? []) perms.add(rp.permissionKey);
    }
    return [...perms];
  }
}
