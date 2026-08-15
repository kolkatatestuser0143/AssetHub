import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { SystemSubscriptionService } from './system-subscription.service';
import { PlanEntitlementSyncService } from './plan-entitlement-sync.service';

@Controller('system/plans')
@UseGuards(SystemAdminGuard)
export class SystemPlanController {
  constructor(
    private readonly subscriptions: SystemSubscriptionService,
    private readonly entitlementSync: PlanEntitlementSyncService,
  ) {}

  @Get()
  @SystemPermission('platform:billing:read')
  list() { return this.subscriptions.listPlans(true); }

  @Post()
  @SystemPermission('platform:billing:manage')
  create(@Body() body: { name: string; features?: Record<string, unknown> }) {
    return this.subscriptions.createPlan(body.name, body.features ?? {});
  }

  @Patch(':planId')
  @SystemPermission('platform:billing:manage')
  async update(@Param('planId') planId: string, @Body() body: { name: string; features?: Record<string, unknown> }) {
    const plan = await this.subscriptions.updatePlan(planId, body.name, body.features ?? {});
    const entitlementSync = await this.entitlementSync.syncPlan(plan.id, plan.features ?? {});
    return { ...plan, entitlementSync };
  }

  @Patch(':planId/status')
  @SystemPermission('platform:billing:manage')
  status(@Param('planId') planId: string, @Body() body: { isActive: boolean }) {
    return this.subscriptions.setPlanActive(planId, body.isActive);
  }
}
