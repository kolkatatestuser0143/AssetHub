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
    const primaryUser = await this.db.user.findOne({ tenantId, accountType: UserAccountType.TENANT }).sort({ createdAt: 1 }).lean();
    if (!primaryUser) throw new NotFoundException('Tenant primary login user not found');
    if (primaryUser.email.toLowerCase() === normalized && (tenant.primaryEmail ?? '').toLowerCase() === normalized) return { tenantId, email: normalized, changed: false };

    const existing = await this.db.user.findOne({ email: normalized, _id: { $ne: primaryUser._id } }).lean();
    if (existing) throw new ConflictException('Email is already registered');

    const oldEmail = primaryUser.email;
    const now = new Date();
    await this.db.user.updateOne({ _id: primaryUser._id }, { $set: { email: normalized, updatedAt: now } });
    await this.db.tenant.updateOne({ _id: tenant._id }, { $set: { primaryEmail: normalized, updatedAt: now } });
    await this.db.session.updateMany({ userId: String(primaryUser._id), revokedAt: { $exists: false } }, { $set: { revokedAt: now, revokedReason: 'platform_primary_email_changed' } });
    await this.db.auditEvent.create({ tenantId, actorUserId, action: 'tenant.primary_login_email_changed', targetType: 'user', targetId: String(primaryUser._id), metadata: { oldEmail, newEmail: normalized }, result: 'success', occurredAt: now });
    return { tenantId, email: normalized, changed: true, sessionsRevoked: true };
  }
}
