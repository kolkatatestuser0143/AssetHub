import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

@Injectable()
export class UsersService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  private safe(user: any) {
    if (!user) return user;
    const dto = toDto(user);
    if (dto && typeof dto === 'object') {
      delete (dto as any).passwordHash;
      delete (dto as any).totpSecretEnc;
      delete (dto as any).backupCodesHash;
      delete (dto as any).accessTokenHash;
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

  async update(auth: AuthContext, userId: string, input: { firstName?: string; lastName?: string; email?: string; jobTitle?: string; phone?: string; departmentId?: string; locationId?: string }) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const current = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!current) throw new NotFoundException('User not found');

    const patch: Record<string, unknown> = {};
    if (input.firstName !== undefined) patch.firstName = input.firstName.trim();
    if (input.lastName !== undefined) patch.lastName = input.lastName.trim();
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      if (email !== current.email) {
        const exists = await this.db.user.findOne({ tenantId: auth.tenantId, email, _id: { $ne: userId } }).lean();
        if (exists) throw new ConflictException('A user with this email already exists');
      }
      patch.email = email;
    }
    if (input.jobTitle !== undefined) patch.jobTitle = input.jobTitle.trim() || undefined;
    if (input.phone !== undefined) patch.phone = input.phone.trim() || undefined;
    if (input.departmentId !== undefined) patch.departmentId = input.departmentId || undefined;
    if (input.locationId !== undefined) patch.locationId = input.locationId || undefined;

    const doc = await this.db.user.findOneAndUpdate(
      { _id: userId, ...this.scope(auth), accountType: 'TENANT' },
      { $set: patch },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('User not found');
    return this.safe(doc);
  }

  async setRoles(auth: AuthContext, userId: string, roleIds: string[]) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const uniqueIds = [...new Set(roleIds.map(String))];
    if (uniqueIds.some((id) => !Types.ObjectId.isValid(id))) throw new ConflictException('Invalid role id');

    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');

    const roles = uniqueIds.length
      ? await this.db.role.find({ _id: { $in: uniqueIds }, ...this.scope(auth) }).lean()
      : [];
    if (roles.length !== uniqueIds.length) throw new NotFoundException('One or more roles are outside your scope');

    if (!auth.crossCompany && roles.some((role: any) => role.companyId && role.companyId !== auth.companyId)) {
      throw new ConflictException('One or more roles are outside your company');
    }

    const doc = await this.db.user.findOneAndUpdate(
      { _id: userId, ...this.scope(auth), accountType: 'TENANT' },
      { $set: { roleIds: uniqueIds } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('User not found');
    return this.safe(doc);
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

  async issueAccessLink(auth: AuthContext, userId: string) {
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');

    const rawToken = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.db.user.updateOne(
      { _id: user._id },
      { $set: { accessTokenHash: hash, accessTokenIssuedAt: new Date(), accessTokenExpiresAt: expiresAt, forcePasswordReset: true } },
    );

    const webBase = (process.env.WEB_APP_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return {
      userId: String(user._id),
      email: user.email,
      expiresAt,
      accessUrl: `${webBase}/accept-invite?token=${encodeURIComponent(rawToken)}`,
      delivery: 'link_generated',
    };
  }

  async sessions(auth: AuthContext, userId: string) {
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');

    const docs = await this.db.session.find({ userId: String(user._id) }).sort({ lastSeenAt: -1, createdAt: -1 }).lean();
    return toDtoArray(docs).map((session: any) => {
      delete session.refreshTokenHash;
      return session;
    });
  }

  async loginHistory(auth: AuthContext, userId: string) {
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');

    const docs = await this.db.loginHistory.find({ userId: String(user._id) }).sort({ occurredAt: -1 }).limit(100).lean();
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
