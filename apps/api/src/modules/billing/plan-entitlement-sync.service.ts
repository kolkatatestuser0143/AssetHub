import { Injectable } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';

@Injectable()
export class PlanEntitlementSyncService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async materializeSubscription(subscriptionId: string, features: Record<string, unknown>) {
    for (const [key, value] of Object.entries(features)) {
      await this.db.entitlement.updateOne(
        { subscriptionId, key },
        { $setOnInsert: { subscriptionId, key, value, source: 'plan' } },
        { upsert: true },
      );
    }
  }

  async syncPlan(planId: string, features: Record<string, unknown>) {
    const subscriptions = await this.db.subscription
      .find({ planId, status: { $in: ['active', 'trialing', 'past_due'] } })
      .lean();

    const keys = Object.keys(features);
    for (const subscription of subscriptions) {
      const subscriptionId = String(subscription._id);
      for (const [key, value] of Object.entries(features)) {
        await this.db.entitlement.updateOne(
          {
            subscriptionId,
            key,
            $or: [{ source: 'plan' }, { source: { $exists: false } }],
          },
          { $set: { value, source: 'plan' }, $setOnInsert: { subscriptionId, key } },
          { upsert: true },
        );
      }
      if (keys.length) {
        await this.db.entitlement.deleteMany({
          subscriptionId,
          source: 'plan',
          key: { $nin: keys },
        });
      } else {
        await this.db.entitlement.deleteMany({ subscriptionId, source: 'plan' });
      }
    }

    return { subscriptionsUpdated: subscriptions.length };
  }

  async markOverride(subscriptionId: string, key: string) {
    await this.db.entitlement.updateOne(
      { subscriptionId, key },
      { $set: { source: 'override' } },
    );
  }
}
