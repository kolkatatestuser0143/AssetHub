import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';
import { InviteService } from '../auth/invite.service';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class UsersService extends TenantScopedRepository {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly invites: InviteService,
    private readonly mail: MailService,
  ) { super(); }

  private safe(user: any) {
    if (!user) return user;
    const dto = toDto(user);
    if (dto && typeof dto === 'object') {
      delete (dto as any).passwordHash;
      delete (dto as any).totpSecretEnc;
      delete (dto as any).backupCodesHash;
      delete (dto as any).accessTokenHash;
      delete (dto as any).accessTokenIssuedAt;
      delete (dto as any).accessTokenExpiresAt;
    }
    return dto;
  }

  async list(auth: AuthContext) {
    const docs = await this.db.user.find({ ...this.scope(auth), accountType: 'TENANT' }).sort({ lastName: 1, firstName: 1 }).lean();
    return toDtoArray(docs).map((u: any) => this.safe(u));
  }

  async get(auth: AuthContext, userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const doc = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!doc) throw new NotFoundException('User not found');
    return this.safe(doc);
  }

  async create(auth: AuthContext, input: { email: string; firstName: string; lastName: string; companyId?: string; jobTitle?: string; phone?: string; departmentId?: string; locationId?: string }) {
    const companyId = input.companyId ?? auth.companyId;
    if (!auth.crossCompany && companyId !== auth.companyId) throw new NotFoundException('Company not in scope');
    const exists = await this.db.user.findOne({ email: input.email.trim().toLowerCase(), tenantId: auth.tenantId }).lean();
    if (exists) throw new ConflictException('A user with this email already exists');
    const doc = await this.db.user.create({
      tenantId: auth.tenantId,
      companyId,
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      jobTitle: input.jobTitle?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      departmentId: input.departmentId || undefined,
      locationId: input.locationId || undefined,
      isActive: true,
      forcePasswordReset: true,
      roleIds: [],
      accountType: 'TENANT',
      mfaMethod: 'NONE',
      backupCodesHash: [],
    });
    return this.safe(doc.toObject());
  }

  async sendAccessEmail(auth: AuthContext, userId: string, action: 'invite' | 'reset') {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new ConflictException('Cannot send access email to an inactive user');

    const token = await this.invites.createInternalToken(String(user._id));
    const appUrl = (process.env.WEB_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const setupUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(token.rawToken)}`;
    const result = await this.mail.sendTenantAccessEmail({
      to: user.email,
      firstName: user.firstName,
      action,
      setupUrl,
      expiresAt: token.expiresAt,
    });

    return {
      ok: true,
      action,
      email: user.email,
      emailSent: result.sent,
      emailConfigured: this.mail.isEnabled(),
      setupUrl: result.sent ? undefined : setupUrl,
      expiresAt: token.expiresAt,
    };
  }

  async setActive(auth: AuthContext, userId: string, active: boolean) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const doc = await this.db.user.findOneAndUpdate(
      { _id: userId, ...this.scope(auth), accountType: 'TENANT' },
      { $set: { isActive: active } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('User not found');
    if (!active) {
      await this.db.session.updateMany({ userId: String(doc._id), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'admin_deactivated' } });
    }
    return this.safe(doc);
  }

  async sessions(auth: AuthContext, userId: string) {
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');

    const docs = await this.db.session
      .find({ userId: String(user._id) })
      .sort({ lastSeenAt: -1, createdAt: -1 })
      .lean();

    return toDtoArray(docs).map((session: any) => {
      delete session.refreshTokenHash;
      return session;
    });
  }

  async loginHistory(auth: AuthContext, userId: string) {
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');

    const docs = await this.db.loginHistory
      .find({ userId: String(user._id) })
      .sort({ occurredAt: -1 })
      .limit(100)
      .lean();

    return toDtoArray(docs);
  }

  async revokeSession(auth: AuthContext, userId: string, sessionId: string, actorUserId: string) {
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');

    if (String(user._id) === actorUserId && String((await this.db.session.findById(sessionId).lean())?._id) === sessionId) {
      throw new ConflictException('Your current session cannot be revoked from this screen');
    }

    const session = await this.db.session.findOneAndUpdate(
      { _id: sessionId, userId: String(user._id), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revokedReason: 'admin_revoked' } },
      { new: true },
    ).lean();

    if (!session) throw new NotFoundException('Active session not found');

    return { ok: true, sessionId: String(session._id) };
  }
}
