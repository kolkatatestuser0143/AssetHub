import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { UserAccountType } from '../../models/user.schemas';

@Injectable()
export class InviteService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async accept(rawToken: string, password: string) {
    if (!rawToken?.trim()) throw new BadRequestException('Invitation token is required');
    if (!password || password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    const hash = createHash('sha256').update(rawToken.trim()).digest('hex');
    const user = await this.db.user.findOne({
      accountType: UserAccountType.TENANT,
      accessTokenHash: hash,
      accessTokenExpiresAt: { $gt: new Date() },
    }).lean();
    if (!user) throw new UnauthorizedException('Invitation link is invalid or expired');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const updated = await this.db.user.findOneAndUpdate(
      { _id: user._id, accessTokenHash: hash },
      {
        $set: { passwordHash, forcePasswordReset: false },
        $unset: { accessTokenHash: 1, accessTokenIssuedAt: 1, accessTokenExpiresAt: 1 },
      },
      { new: true },
    ).lean();

    if (!updated) throw new UnauthorizedException('Invitation link is no longer valid');

    await this.db.loginHistory.create({
      userId: String(updated._id),
      success: true,
      reason: 'invite_password_setup',
      occurredAt: new Date(),
    });

    return { ok: true, email: updated.email };
  }

  async createInternalToken(userId: string) {
    const rawToken = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.db.user.updateOne(
      { _id: userId, accountType: UserAccountType.TENANT },
      { $set: { accessTokenHash: hash, accessTokenIssuedAt: new Date(), accessTokenExpiresAt: expiresAt, forcePasswordReset: true } },
    );

    return { rawToken, expiresAt };
  }
}
