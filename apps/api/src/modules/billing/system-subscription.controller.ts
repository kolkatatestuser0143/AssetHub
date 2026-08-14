import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemSubscriptionService } from './system-subscription.service';

@Controller('system/subscriptions')
@UseGuards(SystemAdminGuard)
export class SystemSubscriptionController {
  constructor(private readonly subscriptions: SystemSubscriptionService) {}

  @Get()
  overview() {
    return this.subscriptions.overview();
  }

  @Patch(':tenantId')
  assign(
    @Param('tenantId') tenantId: string,
    @Body() body: { planId: string; status?: 'active' | 'trialing' | 'past_due' | 'canceled'; endsAt?: string },
    @Req() req: any,
  ) {
    return this.subscriptions.assign(tenantId, body.planId, body.status ?? 'active', body.endsAt, req.systemAuth?.sub);
  }

  @Post(':tenantId/renew')
  renew(
    @Param('tenantId') tenantId: string,
    @Body() body: { endsAt: string },
    @Req() req: any,
  ) {
    return this.subscriptions.renew(tenantId, body.endsAt, req.systemAuth?.sub);
  }

  @Patch(':tenantId/status')
  status(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: 'active' | 'trialing' | 'past_due' | 'canceled' },
    @Req() req: any,
  ) {
    return this.subscriptions.setStatus(tenantId, body.status, req.systemAuth?.sub);
  }

  @Delete(':tenantId')
  revoke(@Param('tenantId') tenantId: string, @Req() req: any) {
    return this.subscriptions.revoke(tenantId, req.systemAuth?.sub);
  }

  @Patch(':tenantId/entitlement/:subscriptionId')
  entitlement(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { key: string; value: unknown },
    @Req() req: any,
  ) {
    return this.subscriptions.setEntitlement(subscriptionId, body.key, body.value, req.systemAuth?.sub);
  }
}
