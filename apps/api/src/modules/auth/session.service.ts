import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';

const ACCESS_TOKEN_TTL = '10m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * The ONE place a session (access + refresh token pair) is minted,
 * regardless of how the user authenticated (password, SAML, OIDC —
 * and eventually SCIM-triggered re-auth). Both AuthService (password
 * login) and IdentityService (SSO callback) depend on this rather
 * than on each other, which is what avoids the circular import
 * mentioned in earlier scaffold notes.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issueSession(userId: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const permissions = await this.resolvePermissions(userId);
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        companyId: user.companyId,
        permissions,
      },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashToken(rawRefreshToken),
        ipAddress: ip,
        userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async revokeSession(sessionId: string, reason: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async findByRefreshToken(rawRefreshToken: string) {
    return this.prisma.session.findUnique({ where: { refreshTokenHash: this.hashToken(rawRefreshToken) } });
  }

  hashToken(raw: string): string {
    // Refresh tokens are hashed at rest, same principle as passwords —
    // a DB read alone should never yield a usable token.
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async resolvePermissions(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const perms = new Set<string>();
    for (const ur of roles) {
      for (const rp of ur.role.permissions) perms.add(rp.permission.key);
    }
    return [...perms];
  }
}
