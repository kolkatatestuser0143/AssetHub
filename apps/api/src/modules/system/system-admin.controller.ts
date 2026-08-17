import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemAdminService } from './system-admin.service';
import { SystemSecurityService } from './system-security.service';
import { PrimaryLoginEmailService } from './primary-login-email.service';
import { SystemTenantProvisioningService } from './system-tenant-provisioning.service';
import { SystemPermission } from '../../common/guards/system-permission.decorator';

class CreateTenantDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @Matches(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/) slug!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(1) planId!: string;
}

class BrandingDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() logoFileId?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() website?: string;
}

class PrimaryLoginEmailDto { @IsEmail() email!: string; }

@Controller('system')
@UseGuards(SystemAdminGuard)
export class SystemAdminController {
  constructor(private readonly service: SystemAdminService, private readonly security: SystemSecurityService, private readonly primaryEmail: PrimaryLoginEmailService, private readonly provisioning: SystemTenantProvisioningService) {}

  @Get('overview') @SystemPermission('platform:overview:read') overview() { return this.service.overview(); }
  @Get('tenants') @SystemPermission('platform:tenants:read') tenants() { return this.service.tenants(); }
  @Post('tenants') @SystemPermission('platform:tenants:manage') createTenant(@Body() dto: CreateTenantDto, @Req() req: any) { return this.provisioning.createTenant({ ...dto, actorUserId: req.systemAuth?.sub }); }
  @Get('tenants/:tenantId') @SystemPermission('platform:tenants:read') tenant(@Param('tenantId') tenantId: string) { return this.service.tenantDetails(tenantId); }
  @Post('tenants/:tenantId/reset-password') @SystemPermission('platform:tenants:manage') resetPassword(@Param('tenantId') tenantId: string, @Req() req: any) { return this.service.resetTenantPassword(tenantId, req.systemAuth?.sub); }
  @Patch('tenants/:tenantId/primary-login-email') @SystemPermission('platform:tenants:manage') changePrimaryLoginEmail(@Param('tenantId') tenantId: string, @Body() dto: PrimaryLoginEmailDto, @Req() req: any) { return this.primaryEmail.change(tenantId, dto.email, req.systemAuth?.sub); }
  @Patch('tenants/:tenantId/branding') @SystemPermission('platform:tenants:manage') branding(@Param('tenantId') tenantId: string, @Body() body: BrandingDto, @Req() req: any) { return this.service.updateTenantBranding(tenantId, body, req.systemAuth?.sub); }
  @Patch('tenants/:tenantId/suspend') @SystemPermission('platform:tenants:manage') suspend(@Param('tenantId') tenantId: string, @Body() body: { reason?: string }, @Req() req: any) { return this.service.setTenantStatus(tenantId, false, req.systemAuth?.sub, body?.reason); }
  @Patch('tenants/:tenantId/activate') @SystemPermission('platform:tenants:manage') activate(@Param('tenantId') tenantId: string, @Req() req: any) { return this.service.setTenantStatus(tenantId, true, req.systemAuth?.sub); }
  @Get('users') @SystemPermission('platform:users:read') users() { return this.service.platformUsers(); }
  @Get('roles') @SystemPermission('platform:roles:read') roles() { return this.service.platformRoles(); }
  @Get('audit') @SystemPermission('platform:audit:read') audit() { return this.service.audit(); }
  @Get('security/sessions') @SystemPermission('platform:audit:read') securitySessions() { return this.security.sessions(); }
  @Post('security/sessions/:sessionId/revoke') @SystemPermission('platform:users:manage') revokeSecuritySession(@Param('sessionId') sessionId: string, @Req() req: any) { return this.security.revokeSession(sessionId, req.systemAuth?.sub); }
  @Post('security/users/:userId/revoke-sessions') @SystemPermission('platform:users:manage') revokeSecurityUserSessions(@Param('userId') userId: string, @Req() req: any) { return this.security.revokeUserSessions(userId, req.systemAuth?.sub, req.systemAuth?.sessionId); }
  @Get('security/login-history') @SystemPermission('platform:audit:read') securityLoginHistory() { return this.security.loginHistory(); }
  @Get('health') @SystemPermission('platform:health:read') health() { return this.service.health(); }
  @Get('analytics') @SystemPermission('platform:analytics:read') analytics() { return this.service.analytics(); }
  @Get('usage') @SystemPermission('platform:analytics:read') usage() { return this.service.usage(); }
  @Get('tenants/:tenantId/usage') @SystemPermission('platform:analytics:read') tenantUsage(@Param('tenantId') tenantId: string) { return this.service.usage(tenantId); }
}
