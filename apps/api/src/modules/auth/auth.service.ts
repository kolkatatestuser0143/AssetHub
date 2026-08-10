import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { SessionService } from './session.service';
import { toDto } from '../../common/mongoose.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly sessions: SessionService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    // Argon2id per master prompt §5 — never MD5/SHA/bcrypt-only.
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async login(email: string, password: string, ip: string, userAgent: string) {
    const userDoc = await this.db.user
      .findOne({ email })
      .lean();

    const user = userDoc ? toDto(userDoc) : null;

    // Constant-shape response: don't leak whether the email exists.
    if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_credentials');
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive');
      throw new UnauthorizedException('Account is inactive');
    }

    // NOTE: MFA challenge step goes here when user.mfaMethod !== NONE —
    // still omitted from this scaffold; login() should return a partial
    // "mfa_required" state rather than tokens until TOTP is verified.
    // Tracked as a known gap in the README, not silently skipped.

    await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
    return this.sessions.issueSession(user.id, ip, userAgent);
  }

  async refresh(rawRefreshToken: string, ip: string, userAgent: string) {
    const session = await this.sessions.findByRefreshToken(rawRefreshToken);

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: once a refresh token is exchanged we immediately
    // revoke it (single-use). If the SAME raw token is presented again, the
    // revoked session remains in MongoDB and the revokedAt check catches it.
    await this.sessions.revokeSession(session.id, session.userId, 'rotated');

    return this.sessions.issueSession(session.userId, ip, userAgent);
  }

  async logout(sessionId: string, userId: string) {
    await this.sessions.revokeSession(sessionId, userId, 'user_logout');
  }

  private async recordLoginAttempt(
    userId: string | null,
    success: boolean,
    ip: string,
    userAgent: string,
    reason: string | null,
  ) {
    if (!userId) return; // no user row to attach unknown-email attempts to
    await this.db.loginHistory.create({
      userId,
      success,
      ipAddress: ip,
      userAgent,
      reason: reason ?? undefined,
      occurredAt: new Date(),
    });
  }
}
