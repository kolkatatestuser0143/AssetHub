import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemAdminService } from './system-admin.service';

@Controller('system')
@UseGuards(SystemAdminGuard)
export class SystemAdminController {
  constructor(private readonly service: SystemAdminService) {}

  @Get('overview') overview() { return this.service.overview(); }
  @Get('tenants') tenants() { return this.service.tenants(); }
  @Patch('tenants/:tenantId/suspend') suspend(@Param('tenantId') tenantId: string, @Req() req: any) { return this.service.setTenantStatus(tenantId, false, req.systemAuth?.sub); }
  @Patch('tenants/:tenantId/activate') activate(@Param('tenantId') tenantId: string, @Req() req: any) { return this.service.setTenantStatus(tenantId, true, req.systemAuth?.sub); }
  @Get('users') users() { return this.service.platformUsers(); }
  @Get('roles') roles() { return this.service.platformRoles(); }
  @Get('audit') audit() { return this.service.audit(); }
  @Get('health') health() { return this.service.health(); }
  @Get('analytics') analytics() { return this.service.analytics(); }
}
