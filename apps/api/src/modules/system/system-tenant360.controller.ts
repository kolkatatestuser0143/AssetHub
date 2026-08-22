import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemPermission } from '../../common/guards/system-permission.decorator';
import { SystemTenant360Service } from './system-tenant360.service';

@Controller('system/tenants')
@UseGuards(SystemAdminGuard)
export class SystemTenant360Controller {
  constructor(private readonly service:SystemTenant360Service){}
  @Get(':tenantId/360') @SystemPermission('platform:tenants:read') get(@Param('tenantId') tenantId:string){return this.service.get(tenantId);}
}
