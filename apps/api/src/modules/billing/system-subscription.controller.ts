import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
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
    @Body() body: { planId: string; status?: string; endsAt?: string },
  ) {
    return this.subscriptions.assign(tenantId, body.planId, body.status ?? 'active', body.endsAt);
  }

  @Patch(':tenantId/entitlement/:subscriptionId')
  entitlement(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { key: string; value: unknown },
  ) {
    return this.subscriptions.setEntitlement(subscriptionId, body.key, body.value);
  }
}
