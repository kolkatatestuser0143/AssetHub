import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';

class TenantNotificationPreferencesDto {
  @IsOptional() @IsBoolean() notificationsEnabled?: boolean;
  @IsOptional() @IsBoolean() assetEvents?: boolean;
  @IsOptional() @IsBoolean() assignmentEvents?: boolean;
  @IsOptional() @IsBoolean() transferEvents?: boolean;
  @IsOptional() @IsBoolean() maintenanceEvents?: boolean;
  @IsOptional() @IsBoolean() warrantyEvents?: boolean;
  @IsOptional() @IsBoolean() securityEvents?: boolean;
  @IsOptional() @IsBoolean() systemEvents?: boolean;
}

class SystemNotificationPreferencesDto {
  @IsOptional() @IsBoolean() notificationsEnabled?: boolean;
  @IsOptional() @IsBoolean() tenantEvents?: boolean;
  @IsOptional() @IsBoolean() subscriptionEvents?: boolean;
  @IsOptional() @IsBoolean() securityEvents?: boolean;
  @IsOptional() @IsBoolean() identityEvents?: boolean;
  @IsOptional() @IsBoolean() platformEvents?: boolean;
}

@Controller('ux/notification-preferences')
@UseGuards(TenantContextGuard, RbacGuard, FeatureGuard)
export class TenantNotificationPreferencesController {
  constructor(private readonly preferences: NotificationPreferencesService) {}
  @Get() get(@Req() req: any) { return this.preferences.getTenant(req.authContext); }
  @Patch() update(@Req() req: any, @Body() dto: TenantNotificationPreferencesDto) { return this.preferences.updateTenant(req.authContext, dto); }
}

@Controller('system/ux/notification-preferences')
@UseGuards(SystemAdminGuard)
export class SystemNotificationPreferencesController {
  constructor(private readonly preferences: NotificationPreferencesService) {}
  @Get() @SystemPermission('platform:console:access') get(@Req() req: any) { return this.preferences.getSystem(String(req.systemAuth.sub)); }
  @Patch() @SystemPermission('platform:console:access') update(@Req() req: any, @Body() dto: SystemNotificationPreferencesDto) { return this.preferences.updateSystem(String(req.systemAuth.sub), dto); }
}
