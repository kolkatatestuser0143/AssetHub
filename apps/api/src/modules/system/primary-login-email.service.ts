import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { UserAccountType } from '../../models/user.schemas';

@Injectable()
export class PrimaryLoginEmailService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async change(tenantId: string, email: string, actorUserId?: string) {
    if (!Types.ObjectId.isValid(tenantId)) throw new BadRequestException('Invalid tenant id');
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new BadRequestException('A valid email address is required');

    const tenant = await this.db.tenant.findById(tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    const primaryUser = tenant.primaryUserId
      ? await this.db.user.findOne({ _id: tenant.primaryUserId, tenantId, accountType: UserAccountType.TENANT }).lean()
      : await this.db.user.findOne({ tenantId, accountType: UserAccountType.TENANT }).sort({ createdAt: 1 }).lean();
    if (!primaryUser) throw new NotFoundException('Tenant primary login user not found');

    if (!tenant.primaryUserId) {
      await this.db.tenant.updateOne({ _id: tenant._id, primaryUserId: { $exists: false } }, { $set: { primaryUserId: String(primaryUser._id), primaryEmail: primaryUser.email.toLowerCase(), updatedAt: new Date() } });
    }

    if (primaryUser.email.toLowerCase() === normalized && (tenant.primaryEmail ?? '').toLowerCase() === normalized) return { tenantId, email: normalized, changed: false };
    const existing = await this.db.user.findOne({ email: normalized, _id: { $ne: primaryUser._id } }).lean();
    if (existing) throw new ConflictException('Email is already registered');

    const oldEmail = primaryUser.email;
    const now = new Date();
    const connection = this.db.tenant.db;
    const session = await connection.startSession();
    try {
      await session.withTransaction(async () => {
        const updated = await this.db.user.findOneAndUpdate(
          { _id: primaryUser._id, tenantId, accountType: UserAccountType.TENANT },
          { $set: { email: normalized, updatedAt: now }, $inc: { authVersion: 1 } },
          { new: true, session },
        ).lean();
        if (!updated) throw new NotFoundException('Tenant primary login user not found');
        const updatedTenant = await this.db.tenant.findOneAndUpdate(
          { _id: tenant._id, primaryUserId: String(primaryUser._id) },
          { $set: { primaryEmail: normalized, updatedAt: now } },
          { new: true, session },
        ).lean();
        if (!updatedTenant) throw new ConflictException('Tenant primary login identity changed concurrently');
        await this.db.session.updateMany({ userId: String(primaryUser._id), revokedAt: { $exists: false } }, { $set: { revokedAt: now, revokedReason: 'platform_primary_email_changed' } }, { session });
        await this.db.auditEvent.create([{ tenantId, actorUserId, action: 'tenant.primary_login_email_changed', targetType: 'user', targetId: String(primaryUser._id), metadata: { oldEmail, newEmail: normalized }, result: 'success', occurredAt: now }], { session });
      });
    } finally {
      await session.endSession();
    }
    return { tenantId, email: normalized, changed: true, sessionsRevoked: true };
  }
}
