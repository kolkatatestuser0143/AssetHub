import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemAdminService } from './system-admin.service';
import { SystemPermission } from '../../common/guards/system-permission.decorator';

@Controller('system')
@UseGuards(SystemAdminGuard)
export class SystemAdminController {
  constructor(private readonly service: SystemAdminService) {}

  @Get('overview')
  @SystemPermission('platform:overview:read')
  overview() { return this.service.overview(); }

  @Get('tenants')
  @SystemPermission('platform:tenants:read')
  tenants() { return this.service.tenants(); }

  @Patch('tenants/:tenantId/suspend')
  @SystemPermission('platform:tenants:manage')
  suspend(@Param('tenantId') tenantId: string, @Req() req: any) { return this.service.setTenantStatus(tenantId, false, req.systemAuth?.sub); }

  @Patch('tenants/:tenantId/activate')
  @SystemPermission('platform:tenants:manage')
  activate(@Param('tenantId') tenantId: string, @Req() req: any) { return this.service.setTenantStatus(tenantId, true, req.systemAuth?.sub); }

  @Get('users')
  @SystemPermission('platform:users:read')
  users() { return this.service.platformUsers(); }

  @Patch('users/:userId/roles')
  @SystemPermission('platform:users:manage')
  setUserRoles(@Param('userId') userId: string, @Body() body: { roleIds: string[] }, @Req() req: any) {
    return this.service.setPlatformUserRoles(userId, body.roleIds ?? [], req.systemAuth?.sub);
  }

  @Get('roles')
  @SystemPermission('platform:roles:read')
  roles() { return this.service.platformRoles(); }

  @Get('audit')
  @SystemPermission('platform:audit:read')
  audit() { return this.service.audit(); }

  @Get('health')
  @SystemPermission('platform:health:read')
  health() { return this.service.health(); }

  @Get('analytics')
  @SystemPermission('platform:analytics:read')
  analytics() { return this.service.analytics(); }
}
