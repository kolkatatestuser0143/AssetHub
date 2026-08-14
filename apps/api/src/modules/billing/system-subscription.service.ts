import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';

@Injectable()
export class SystemSubscriptionService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async listPlans(includeArchived = true) {
    const filter = includeArchived ? {} : { $or: [{ isActive: true }, { isActive: { $exists: false } }] };
    const plans = await this.db.plan.find(filter).sort({ name: 1 }).lean();
    return plans.map((plan: any) => ({
      id: String(plan._id),
      name: plan.name,
      features: plan.features ?? {},
      isActive: plan.isActive !== false,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));
  }

  async createPlan(name: string, features: Record<string, unknown> = {}) {
    const normalizedName = name?.trim();
    if (!normalizedName) throw new BadRequestException('Plan name is required');
    if (!features || typeof features !== 'object' || Array.isArray(features)) throw new BadRequestException('Plan features must be an object');
    const existing = await this.db.plan.findOne({ name: normalizedName }).lean();
    if (existing) throw new ConflictException('A plan with this name already exists');
    const plan = await this.db.plan.create({ name: normalizedName, features, isActive: true });
    return { id: String(plan._id), name: plan.name, features: plan.features ?? {}, isActive: true, createdAt: plan.createdAt, updatedAt: plan.updatedAt };
  }

  async updatePlan(planId: string, name: string, features: Record<string, unknown>) {
    if (!Types.ObjectId.isValid(planId)) throw new BadRequestException('Invalid plan id');
    const normalizedName = name?.trim();
    if (!normalizedName) throw new BadRequestException('Plan name is required');
    if (!features || typeof features !== 'object' || Array.isArray(features)) throw new BadRequestException('Plan features must be an object');
    const duplicate = await this.db.plan.findOne({ name: normalizedName, _id: { $ne: planId } }).lean();
    if (duplicate) throw new ConflictException('A plan with this name already exists');
    const plan = await this.db.plan.findByIdAndUpdate(planId, { $set: { name: normalizedName, features } }, { new: true }).lean();
    if (!plan) throw new NotFoundException('Plan not found');
    return { id: String(plan._id), name: plan.name, features: plan.features ?? {}, isActive: plan.isActive !== false, createdAt: plan.createdAt, updatedAt: plan.updatedAt };
  }

  async setPlanActive(planId: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(planId)) throw new BadRequestException('Invalid plan id');
    const plan = await this.db.plan.findById(planId).lean();
    if (!plan) throw new NotFoundException('Plan not found');
    if (!isActive) {
      const inUse = await this.db.subscription.exists({ planId: String(plan._id), status: { $in: ['active', 'trialing', 'past_due'] } });
      if (inUse) throw new ConflictException('Cannot archive a plan that is assigned to an active subscription');
    }
    const updated = await this.db.plan.findByIdAndUpdate(planId, { $set: { isActive } }, { new: true }).lean();
    if (!updated) throw new NotFoundException('Plan not found');
    return { id: String(updated._id), name: updated.name, features: updated.features ?? {}, isActive: updated.isActive !== false };
  }

  async overview() {
    const [plans, subscriptions] = await Promise.all([
      this.db.plan.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] }).sort({ name: 1 }).lean(),
      this.db.subscription.find({ status: { $ne: 'revoked' } }).sort({ createdAt: -1 }).lean(),
    ]);
    return {
      plans: plans.map((plan: any) => ({ id: String(plan._id), name: plan.name, features: plan.features ?? {}, isActive: plan.isActive !== false })),
      subscriptions: subscriptions.map((sub: any) => this.dto(sub)),
    };
  }

  async revokedTenants() {
    const [subscriptions, tenants, plans] = await Promise.all([
      this.db.subscription.find({ status: 'revoked' }).sort({ updatedAt: -1, createdAt: -1 }).lean(),
      this.db.tenant.find({}).lean(),
      this.db.plan.find({}).lean(),
    ]);
    const tenantMap = new Map(tenants.map((tenant: any) => [String(tenant._id), tenant]));
    const planMap = new Map(plans.map((plan: any) => [String(plan._id), plan]));
    return subscriptions.map((sub: any) => ({
      ...this.dto(sub),
      tenantName: tenantMap.get(String(sub.tenantId))?.name ?? String(sub.tenantId),
      planName: planMap.get(String(sub.planId))?.name ?? String(sub.planId),
    }));
  }

  private async getTenantOrThrow(tenantId: string) {
    if (!Types.ObjectId.isValid(tenantId)) throw new BadRequestException('Invalid tenant id');
    const tenant = await this.db.tenant.findById(tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  private async getPlanOrThrow(planId: string) {
    if (!Types.ObjectId.isValid(planId)) throw new BadRequestException('Invalid plan id');
    const plan = await this.db.plan.findById(planId).lean();
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.isActive === false) throw new ConflictException('Plan is archived and cannot be assigned');
    return plan;
  }

  private dto(subscription: any) {
    return {
      id: String(subscription._id),
      tenantId: subscription.tenantId,
      planId: subscription.planId,
      status: subscription.status,
      startedAt: subscription.startedAt,
      endsAt: subscription.endsAt ?? null,
    };
  }

  private async audit(tenantId: string, action: string, targetId: string, metadata: Record<string, unknown>, actorUserId?: string) {
    await this.db.auditEvent.create({
      tenantId,
      actorUserId,
      action,
      targetType: 'subscription',
      targetId,
      metadata,
      occurredAt: new Date(),
    });
  }

  async assign(tenantId: string, planId: string, status = 'active', endsAt?: string, actorUserId?: string) {
    await this.getTenantOrThrow(tenantId);
    const plan = await this.getPlanOrThrow(planId);
    const current = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    const expiry = endsAt ? new Date(endsAt) : undefined;
    if (expiry && Number.isNaN(expiry.getTime())) throw new BadRequestException('Invalid endsAt');

    const update = { $set: { planId: String(plan._id), status, ...(expiry ? { endsAt: expiry } : {}) } };
    const subscription = current
      ? await this.db.subscription.findOneAndUpdate({ _id: current._id }, update, { new: true }).lean()
      : await this.db.subscription.create({
          tenantId,
          planId: String(plan._id),
          status,
          startedAt: new Date(),
          ...(expiry ? { endsAt: expiry } : {}),
        });

    if (!subscription) throw new NotFoundException('Subscription could not be saved');
    await this.audit(tenantId, current?.status === 'revoked' ? 'subscription.reactivated' : current ? 'subscription.updated' : 'subscription.created', String(subscription._id), {
      planId: String(plan._id),
      status,
      endsAt: subscription.endsAt ?? null,
    }, actorUserId);
    return this.dto(subscription);
  }

  async renew(tenantId: string, endsAt: string, actorUserId?: string) {
    await this.getTenantOrThrow(tenantId);
    const expiry = new Date(endsAt);
    if (Number.isNaN(expiry.getTime())) throw new BadRequestException('Invalid renewal date');
    const current = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    if (!current) throw new NotFoundException('No subscription found for tenant');

    const subscription = await this.db.subscription.findOneAndUpdate(
      { _id: current._id },
      { $set: { status: 'active', endsAt: expiry } },
      { new: true },
    ).lean();
    if (!subscription) throw new NotFoundException('Subscription could not be renewed');
    await this.audit(tenantId, current.status === 'revoked' ? 'subscription.reactivated' : 'subscription.renewed', String(subscription._id), { endsAt: expiry }, actorUserId);
    return this.dto(subscription);
  }

  async setStatus(tenantId: string, status: 'active' | 'trialing' | 'past_due' | 'canceled', actorUserId?: string) {
    await this.getTenantOrThrow(tenantId);
    const current = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    if (!current) throw new NotFoundException('No subscription found for tenant');
    const subscription = await this.db.subscription.findOneAndUpdate(
      { _id: current._id },
      { $set: { status, ...(status === 'canceled' ? { endsAt: new Date() } : {}) } },
      { new: true },
    ).lean();
    if (!subscription) throw new NotFoundException('Subscription could not be updated');
    await this.audit(tenantId, `subscription.${status}`, String(subscription._id), { status }, actorUserId);
    return this.dto(subscription);
  }

  async revoke(tenantId: string, actorUserId?: string) {
    await this.getTenantOrThrow(tenantId);
    const current = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    if (!current) throw new NotFoundException('No subscription found for tenant');
    const subscription = await this.db.subscription.findOneAndUpdate(
      { _id: current._id },
      { $set: { status: 'revoked', endsAt: new Date() } },
      { new: true },
    ).lean();
    if (!subscription) throw new NotFoundException('Subscription could not be revoked');
    await this.db.entitlement.deleteMany({ subscriptionId: String(current._id) });
    await this.audit(tenantId, 'subscription.revoked', String(subscription._id), { planId: current.planId }, actorUserId);
    return this.dto(subscription);
  }

  async setEntitlement(subscriptionId: string, key: string, value: unknown, actorUserId?: string) {
    const subscription = await this.db.subscription.findById(subscriptionId).lean();
    if (!subscription) throw new NotFoundException('Subscription not found');
    const normalizedKey = key.trim();
    if (!normalizedKey) throw new BadRequestException('Entitlement key is required');
    const entitlement = await this.db.entitlement.findOneAndUpdate(
      { subscriptionId, key: normalizedKey },
      { $set: { value } },
      { upsert: true, new: true },
    ).lean();
    await this.audit(subscription.tenantId, 'subscription.entitlement_updated', subscriptionId, { key: normalizedKey, value }, actorUserId);
    return { id: String(entitlement?._id), subscriptionId, key: normalizedKey, value: entitlement?.value };
  }
}
