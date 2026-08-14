import { Injectable, NotFoundException } from '@nestjs/common';
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
      subscriptions: subscriptions.map((sub: any) => ({ id: String(sub._id), tenantId: sub.tenantId, planId: sub.planId, status: sub.status, startedAt: sub.startedAt, endsAt: sub.endsAt ?? null })),
    };
  }

  async assign(tenantId: string, planId: string, status = 'active', endsAt?: string) {
    if (!Types.ObjectId.isValid(planId)) throw new NotFoundException('Plan not found');
    const plan = await this.db.plan.findById(planId).lean();
    if (!plan) throw new NotFoundException('Plan not found');

    const current = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    const subscription = current
      ? await this.db.subscription.findOneAndUpdate(
          { _id: current._id },
          { $set: { planId: String(plan._id), status, endsAt: endsAt ? new Date(endsAt) : undefined } },
          { new: true },
        ).lean()
      : await this.db.subscription.create({ tenantId, planId: String(plan._id), status, startedAt: new Date(), ...(endsAt ? { endsAt: new Date(endsAt) } : {}) });

    if (!subscription) throw new NotFoundException('Subscription could not be saved');
    return { id: String(subscription._id), tenantId: subscription.tenantId, planId: subscription.planId, status: subscription.status, startedAt: subscription.startedAt, endsAt: subscription.endsAt ?? null };
  }

  async setEntitlement(subscriptionId: string, key: string, value: unknown) {
    const subscription = await this.db.subscription.findById(subscriptionId).lean();
    if (!subscription) throw new NotFoundException('Subscription not found');
    const entitlement = await this.db.entitlement.findOneAndUpdate(
      { subscriptionId, key },
      { $set: { value } },
      { upsert: true, new: true },
    ).lean();
    return { id: String(entitlement?._id), subscriptionId, key, value: entitlement?.value };
  }
}
