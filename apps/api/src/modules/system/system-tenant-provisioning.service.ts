import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { TenantStatus } from '../../models/tenancy.schemas';
import { UserAccountType } from '../../models/user.schemas';

@Injectable()
export class SystemTenantProvisioningService {
  constructor(private readonly db: MongooseDatabaseService) {}

  private generateTemporaryPassword() { return `Ah-${crypto.randomBytes(9).toString('base64url')}`; }

  async createTenant(input: { name: string; slug: string; email: string; planId: string; actorUserId?: string }) {
    const name = input.name?.trim();
    const slug = input.slug?.trim().toLowerCase();
    const email = input.email?.trim().toLowerCase();
    if (!name) throw new BadRequestException('Company name is required');
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) throw new BadRequestException('Tenant slug must contain only lowercase letters, numbers and hyphens');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('A valid tenant login email is required');
    if (!Types.ObjectId.isValid(input.planId)) throw new BadRequestException('Invalid subscription plan');
    if (await this.db.tenant.exists({ slug })) throw new ConflictException('Tenant slug is already in use');
    if (await this.db.user.exists({ email })) throw new ConflictException('Email is already registered');
    const plan = await this.db.plan.findById(input.planId).lean();
    if (!plan || plan.isActive === false) throw new NotFoundException('Subscription plan not found or inactive');

    const tenantId = new Types.ObjectId();
    const companyId = new Types.ObjectId();
    const roleId = new Types.ObjectId();
    const primaryUserId = new Types.ObjectId();
    const subscriptionId = new Types.ObjectId();
    const password = this.generateTemporaryPassword();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const permissionDocs = await this.db.permission.find({ key: { $not: /^platform:/ } }).lean();
    const rolePermissions = permissionDocs.map((p: any) => ({ permissionId: String(p._id), permissionKey: p.key }));
    const now = new Date();
    const session = await this.db.tenant.db.startSession();

    try {
      await session.withTransaction(async () => {
        await this.db.tenant.create([{ _id: tenantId, name, slug, primaryUserId: String(primaryUserId), primaryEmail: email, status: TenantStatus.ACTIVE, createdAt: now, updatedAt: now }], { session });
        await this.db.company.create([{ _id: companyId, tenantId: String(tenantId), name, code: slug.slice(0, 12).toUpperCase(), createdAt: now, updatedAt: now }], { session });
        await this.db.role.create([{ _id: roleId, tenantId: String(tenantId), companyId: String(companyId), name: 'Tenant Admin', isSystem: true, permissions: rolePermissions, createdAt: now, updatedAt: now }], { session });
        await this.db.user.create([{ _id: primaryUserId, tenantId: String(tenantId), companyId: String(companyId), accountType: UserAccountType.TENANT, email, passwordHash, firstName: name.split(/\s+/)[0] || 'Tenant', lastName: name.split(/\s+/).slice(1).join(' ') || 'Admin', isActive: true, forcePasswordReset: true, authVersion: 0, roleIds: [String(roleId)], backupCodesHash: [], createdAt: now, updatedAt: now }], { session });
        await this.db.subscription.create([{ _id: subscriptionId, tenantId: String(tenantId), planId: String(plan._id), status: 'active', startedAt: now, createdAt: now, updatedAt: now }], { session });
        const features = (plan.features ?? {}) as Record<string, unknown>;
        const entitlements = Object.entries(features).map(([key, value]) => ({ subscriptionId: String(subscriptionId), key, value, source: 'plan' }));
        if (entitlements.length) await this.db.entitlement.create(entitlements, { session });
        await this.db.auditEvent.create([{ tenantId: String(tenantId), actorUserId: input.actorUserId, action: 'tenant.created', targetType: 'tenant', targetId: String(tenantId), metadata: { name, slug, email, planId: String(plan._id) }, result: 'success', occurredAt: now }], { session });
      });
    } finally {
      await session.endSession();
    }

    return {
      tenant: { id: String(tenantId), name, slug, primaryEmail: email, status: TenantStatus.ACTIVE, logoUrl: null },
      subscription: { id: String(subscriptionId), tenantId: String(tenantId), planId: String(plan._id), status: 'active', startedAt: now, endsAt: null, graceUntil: null },
      credentials: { email, temporaryPassword: password, mustChangePassword: true },
    };
  }
}
