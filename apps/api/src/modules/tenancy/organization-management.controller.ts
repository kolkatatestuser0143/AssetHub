import { Body, Controller, Delete, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { OrganizationManagementService } from './organization-management.service';
import { SiteType } from '../../common/domain/tenancy.enums';

class CompanyEditDto { @IsString() @MinLength(1) name!: string; @IsString() @MinLength(2) code!: string; }
class NameEditDto { @IsString() @MinLength(1) name!: string; }
class SiteEditDto { @IsString() @MinLength(1) name!: string; @IsOptional() @IsIn(Object.values(SiteType)) type?: SiteType; }

@Controller('companies')
@UseGuards(TenantContextGuard, RbacGuard)
export class OrganizationManagementController {
  constructor(private readonly service: OrganizationManagementService) {}

  @Patch(':companyId') @RequirePermission('company:write')
  updateCompany(@Param('companyId') companyId: string, @Body() dto: CompanyEditDto, @Req() req: any) { return this.service.updateCompany(req.authContext, companyId, dto.name, dto.code); }

  @Delete(':companyId') @RequirePermission('company:write')
  deleteCompany(@Param('companyId') companyId: string, @Req() req: any) { return this.service.deleteCompany(req.authContext, companyId); }

  @Patch('sites/:siteId') @RequirePermission('company:write')
  updateSite(@Param('siteId') id: string, @Body() dto: SiteEditDto, @Req() req: any) { return this.service.updateSite(req.authContext, id, dto.name, dto.type ?? SiteType.PLANT); }

  @Delete('sites/:siteId') @RequirePermission('company:write')
  deleteSite(@Param('siteId') id: string, @Req() req: any) { return this.service.deleteSite(req.authContext, id); }

  @Patch('locations/:locationId') @RequirePermission('company:write')
  updateLocation(@Param('locationId') id: string, @Body() dto: NameEditDto, @Req() req: any) { return this.service.updateLocation(req.authContext, id, dto.name); }

  @Delete('locations/:locationId') @RequirePermission('company:write')
  deleteLocation(@Param('locationId') id: string, @Req() req: any) { return this.service.deleteLocation(req.authContext, id); }

  @Patch('departments/:departmentId') @RequirePermission('company:write')
  updateDepartment(@Param('departmentId') id: string, @Body() dto: NameEditDto, @Req() req: any) { return this.service.updateDepartment(req.authContext, id, dto.name); }

  @Delete('departments/:departmentId') @RequirePermission('company:write')
  deleteDepartment(@Param('departmentId') id: string, @Req() req: any) { return this.service.deleteDepartment(req.authContext, id); }
}
