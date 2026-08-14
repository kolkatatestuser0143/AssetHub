import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';

@Injectable()
export class EntitlementService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async getActiveSubscription(tenantId: string) {
    const subscription = await this.db.subscription.findOne({ tenantId, status: { $in: ['active', 'trialing', 'past_due'] } }).sort({ createdAt: -1 }).lean();
    if (!subscription) throw new ForbiddenException('Tenant has no active license');
    if (subscription.endsAt && new Date(subscription.endsAt).getTime() < Date.now()) throw new ForbiddenException('Tenant license has expired');
    return subscription;
  }

  async get(tenantId: string, key: string): Promise<unknown> {
    const subscription = await this.getActiveSubscription(tenantId);
    const entitlement = await this.db.entitlement.findOne({ subscriptionId: String(subscription._id), key }).lean();
    if (entitlement) return entitlement.value;
    const plan = await this.db.plan.findById(subscription.planId).lean();
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return (plan.features as any)?.[key];
  }

  async requireFeature(tenantId: string, key: string) {
    const value = await this.get(tenantId, key);
    if (value !== true) throw new ForbiddenException(`Feature not enabled: ${key}`);
    return true;
  }

  async requireWithinLimit(tenantId: string, key: string, currentCount: number, increment = 1) {
    const value = await this.get(tenantId, key);
    if (value === null || value === undefined) return true;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new ForbiddenException(`Invalid license limit: ${key}`);
    if (currentCount + increment > value) throw new ForbiddenException(`License limit reached: ${key} (${value})`);
    return true;
  }
}
