import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
}
