import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemSubscriptionService } from './system-subscription.service';
import { PlanEntitlementSyncService } from './plan-entitlement-sync.service';
import { SystemPermission } from '../../common/guards/system-permission.decorator';

@Controller('system/subscriptions')
@UseGuards(SystemAdminGuard)
export class SystemSubscriptionController {
  constructor(private readonly subscriptions: SystemSubscriptionService, private readonly entitlementSync: PlanEntitlementSyncService) {}

  @Get()
  @SystemPermission('platform:billing:read')
  overview() { return this.subscriptions.overview(); }

  @Get('revoked')
  @SystemPermission('platform:billing:read')
  revoked() { return this.subscriptions.revokedTenants(); }

  @Get('../plans')
  @SystemPermission('platform:billing:read')
  plans() { return this.subscriptions.listPlans(true); }

  @Post('../plans')
  @SystemPermission('platform:billing:manage')
  createPlan(@Body() body: { name: string; features?: Record<string, unknown> }) { return this.subscriptions.createPlan(body.name, body.features ?? {}); }

  @Patch('../plans/:planId')
  @SystemPermission('platform:billing:manage')
  async updatePlan(@Param('planId') planId: string, @Body() body: { name: string; features: Record<string, unknown> }) {
    const plan = await this.subscriptions.updatePlan(planId, body.name, body.features ?? {});
    const sync = await this.entitlementSync.syncPlan(plan.id, plan.features);
    return { ...plan, entitlementSync: sync };
  }

  @Patch('../plans/:planId/status')
  @SystemPermission('platform:billing:manage')
  planStatus(@Param('planId') planId: string, @Body() body: { isActive: boolean }) { return this.subscriptions.setPlanActive(planId, body.isActive); }

  @Patch(':tenantId')
  @SystemPermission('platform:billing:manage')
  async assign(@Param('tenantId') tenantId: string, @Body() body: { planId: string; status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'; endsAt?: string }, @Req() req: any) {
    return this.subscriptions.assign(tenantId, body.planId, body.status ?? 'active', body.endsAt, req.systemAuth?.sub);
  }

  @Post(':tenantId/renew')
  @SystemPermission('platform:billing:manage')
  renew(@Param('tenantId') tenantId: string, @Body() body: { endsAt: string }, @Req() req: any) { return this.subscriptions.renew(tenantId, body.endsAt, req.systemAuth?.sub); }

  @Patch(':tenantId/status')
  @SystemPermission('platform:billing:manage')
  status(@Param('tenantId') tenantId: string, @Body() body: { status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' }, @Req() req: any) { return this.subscriptions.setStatus(tenantId, body.status, req.systemAuth?.sub); }

  @Delete(':tenantId')
  @SystemPermission('platform:billing:manage')
  revoke(@Param('tenantId') tenantId: string, @Req() req: any) { return this.subscriptions.revoke(tenantId, req.systemAuth?.sub); }

  @Patch(':tenantId/entitlement/:subscriptionId')
  @SystemPermission('platform:billing:manage')
  async entitlement(@Param('subscriptionId') subscriptionId: string, @Body() body: { key: string; value: unknown }, @Req() req: any) {
    return this.subscriptions.setEntitlement(subscriptionId, body.key, body.value, req.systemAuth?.sub);
  }
}
