import { Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';

@Injectable()
export class SystemEntitlementAuditService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async getTenantEntitlements(tenantId: string) {
    const subscription = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    if (!subscription) throw new NotFoundException('Tenant subscription not found');

    const plan = await this.db.plan.findById(subscription.planId).lean();
    const entitlements = await this.db.entitlement.find({ subscriptionId: String(subscription._id) }).sort({ key: 1 }).lean();
    const planFeatures = (plan?.features ?? {}) as Record<string, unknown>;
    const keys = new Set([...Object.keys(planFeatures), ...entitlements.map((e: any) => e.key)]);

    return {
      subscription: {
        id: String(subscription._id),
        status: subscription.status,
        planId: subscription.planId,
        planName: plan?.name ?? null,
        startedAt: subscription.startedAt,
        endsAt: subscription.endsAt,
      },
      entitlements: [...keys].sort().map((key) => {
        const record: any = entitlements.find((e: any) => e.key === key);
        const planValue = planFeatures[key];
        return {
          key,
          value: record?.value ?? planValue,
          planValue,
          source: record?.source === 'override' ? 'override' : 'plan',
          overridden: record?.source === 'override',
          updatedAt: record?.updatedAt ?? null,
        };
      }),
    };
  }

  async history(tenantId: string, limit = 200) {
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    return this.db.auditEvent
      .find({ tenantId, action: { $in: ['billing.entitlement_changed', 'billing.plan_changed', 'billing.subscription_changed'] } })
      .sort({ occurredAt: -1 })
      .limit(safeLimit)
      .lean();
  }

  async recordChange(tenantId: string, actorUserId: string | undefined, metadata: Record<string, unknown>) {
    await this.db.auditEvent.create({
      tenantId,
      actorUserId,
      action: 'billing.entitlement_changed',
      targetType: 'tenant_entitlement',
      targetId: String(metadata.key ?? ''),
      metadata,
      occurredAt: new Date(),
    });
  }
}
