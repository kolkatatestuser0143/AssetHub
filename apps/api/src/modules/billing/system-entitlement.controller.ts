import { Body, Controller, Get, NotFoundException, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { SystemEntitlementAuditService } from './system-entitlement-audit.service';

@Controller('system/tenants/:tenantId/entitlements')
@UseGuards(SystemAdminGuard)
export class SystemEntitlementController {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly audit: SystemEntitlementAuditService,
  ) {}

  @Get()
  @SystemPermission('platform:billing:read')
  get(@Param('tenantId') tenantId: string) {
    return this.audit.getTenantEntitlements(tenantId);
  }

  @Get('history')
  @SystemPermission('platform:billing:read')
  history(@Param('tenantId') tenantId: string) {
    return this.audit.history(tenantId);
  }

  @Patch(':key')
  @SystemPermission('platform:billing:manage')
  async override(
    @Param('tenantId') tenantId: string,
    @Param('key') key: string,
    @Body() body: { value: unknown; reason?: string },
    @Req() req: any,
  ) {
    const subscription = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    if (!subscription) throw new NotFoundException('Tenant subscription not found');
    const subscriptionId = String(subscription._id);
    const previous = await this.db.entitlement.findOne({ subscriptionId, key }).lean();
    const plan = await this.db.plan.findById(subscription.planId).lean();
    const planValue = (plan?.features as any)?.[key];

    await this.db.entitlement.updateOne(
      { subscriptionId, key },
      { $set: { value: body.value, source: 'override' }, $setOnInsert: { subscriptionId, key } },
      { upsert: true },
    );
    await this.audit.recordChange(tenantId, req?.user?.userId ?? req?.user?.sub, {
      key,
      previousValue: previous?.value ?? planValue,
      newValue: body.value,
      source: 'override',
      reason: body.reason?.trim() || undefined,
      subscriptionId,
    });
    return this.audit.getTenantEntitlements(tenantId);
  }

  @Patch(':key/reset')
  @SystemPermission('platform:billing:manage')
  async reset(@Param('tenantId') tenantId: string, @Param('key') key: string, @Req() req: any) {
    const subscription = await this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
    if (!subscription) throw new NotFoundException('Tenant subscription not found');
    const subscriptionId = String(subscription._id);
    const previous = await this.db.entitlement.findOne({ subscriptionId, key }).lean();
    const plan = await this.db.plan.findById(subscription.planId).lean();
    const planValue = (plan?.features as any)?.[key];
    if ((previous as any)?.source === 'override') {
      if (planValue === undefined) await this.db.entitlement.deleteOne({ subscriptionId, key });
      else await this.db.entitlement.updateOne({ subscriptionId, key }, { $set: { value: planValue, source: 'plan' } });
      await this.audit.recordChange(tenantId, req?.user?.userId ?? req?.user?.sub, {
        key,
        previousValue: previous?.value,
        newValue: planValue,
        source: 'plan',
        reason: 'Reset tenant override to plan default',
        subscriptionId,
      });
    }
    return this.audit.getTenantEntitlements(tenantId);
  }
}
