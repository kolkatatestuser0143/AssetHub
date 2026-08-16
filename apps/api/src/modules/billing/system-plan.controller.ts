import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { SystemSubscriptionService } from './system-subscription.service';
import { PlanEntitlementSyncService } from './plan-entitlement-sync.service';

const THEME_PRESETS = ['trial', 'starter', 'professional', 'enterprise', 'restricted'] as const;
type ThemePreset = typeof THEME_PRESETS[number];

function themePreset(value: unknown): ThemePreset {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!(THEME_PRESETS as readonly string[]).includes(normalized)) throw new Error('Invalid theme preset');
  return normalized as ThemePreset;
}

@Controller('system/plans')
@UseGuards(SystemAdminGuard)
export class SystemPlanController {
  constructor(private readonly subscriptions: SystemSubscriptionService, private readonly entitlementSync: PlanEntitlementSyncService) {}

  @Get() @SystemPermission('platform:billing:read') list() { return this.subscriptions.listPlans(true); }

  @Post() @SystemPermission('platform:billing:manage')
  create(@Body() body: { name: string; features?: Record<string, unknown>; themePreset?: string }) {
    return this.subscriptions.createPlan(body.name, body.features ?? {}, themePreset(body.themePreset ?? 'starter'));
  }

  @Patch(':planId') @SystemPermission('platform:billing:manage')
  async update(@Param('planId') planId: string, @Body() body: { name: string; features?: Record<string, unknown>; themePreset?: string }) {
    const plan = await this.subscriptions.updatePlan(planId, body.name, body.features ?? {}, themePreset(body.themePreset ?? 'starter'));
    const entitlementSync = await this.entitlementSync.syncPlan(plan.id, plan.features ?? {});
    return { ...plan, entitlementSync };
  }

  @Patch(':planId/status') @SystemPermission('platform:billing:manage')
  status(@Param('planId') planId: string, @Body() body: { isActive: boolean }) { return this.subscriptions.setPlanActive(planId, body.isActive); }
}
