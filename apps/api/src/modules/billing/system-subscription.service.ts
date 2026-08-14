import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';

@Injectable()
export class SystemSubscriptionService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async overview() {
    const [plans, subscriptions] = await Promise.all([
      this.db.plan.find({}).sort({ name: 1 }).lean(),
      this.db.subscription.find({}).sort({ createdAt: -1 }).lean(),
    ]);
    return {
      plans: plans.map((plan: any) => ({ id: String(plan._id), name: plan.name, features: plan.features ?? {} })),
      subscriptions: subscriptions.map((sub: any) => ({
        id: String(sub._id),
        tenantId: sub.tenantId,
        planId: sub.planId,
        status: sub.status,
        startedAt: sub.startedAt,
        endsAt: sub.endsAt ?? null,
      })),
    };
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

    const subscription = current
      ? await this.db.subscription.findOneAndUpdate(
          { _id: current._id },
          { $set: { planId: String(plan._id), status, ...(expiry ? { endsAt: expiry } : {}) } },
          { new: true },
        ).lean()
      : await this.db.subscription.create({
          tenantId,
          planId: String(plan._id),
          status,
          startedAt: new Date(),
          ...(expiry ? { endsAt: expiry } : {}),
        });

    if (!subscription) throw new NotFoundException('Subscription could not be saved');
    await this.audit(tenantId, current ? 'subscription.updated' : 'subscription.created', String(subscription._id), {
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
    await this.audit(tenantId, 'subscription.renewed', String(subscription._id), { endsAt: expiry }, actorUserId);
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
    await this.db.entitlement.deleteMany({ subscriptionId: String(current._id) });
    const removed = await this.db.subscription.deleteOne({ _id: current._id });
    if (!removed.deletedCount) throw new NotFoundException('Subscription could not be revoked');
    await this.audit(tenantId, 'subscription.revoked', String(current._id), { planId: current.planId }, actorUserId);
    return { ok: true, tenantId };
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
