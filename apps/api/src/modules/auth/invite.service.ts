import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class InviteService {
  constructor(private readonly db: PrismaService) {}

  async accept(rawToken: string, password: string) {
    if (!rawToken?.trim()) throw new BadRequestException('Invitation token is required');
    if (!password || password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    const hash = createHash('sha256').update(rawToken.trim()).digest('hex');
    const user = await this.db.user.findFirst({ where: { accountType: 'TENANT', accessTokenHash: hash, accessTokenExpiresAt: { gt: new Date() } } });
    if (!user) throw new UnauthorizedException('Invitation link is invalid or expired');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const updated = await this.db.user.updateMany({ where: { id: user.id, accessTokenHash: hash }, data: { passwordHash, forcePasswordReset: false, accessTokenHash: null, accessTokenIssuedAt: null, accessTokenExpiresAt: null } });
    if (!updated.count) throw new UnauthorizedException('Invitation link is no longer valid');
    await this.db.loginHistory.create({ data: { userId: user.id, success: true, reason: 'invite_password_setup' } });
    return { ok: true, email: user.email };
  }

  async createInternalToken(userId: string) {
    const rawToken = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.db.user.update({ where: { id: userId }, data: { accessTokenHash: hash, accessTokenIssuedAt: new Date(), accessTokenExpiresAt: expiresAt, forcePasswordReset: true } });
    return { rawToken, expiresAt };
  }
}
