import { Body, Controller, Delete, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { OrganizationManagementService } from './organization-management.service';

class CompanyEditDto { @IsString() @MinLength(1) name!: string; @IsString() @MinLength(2) code!: string; }
class NameEditDto { @IsString() @MinLength(1) name!: string; }

@Controller('companies')
@UseGuards(TenantContextGuard, RbacGuard)
export class OrganizationManagementController {
  constructor(private readonly service: OrganizationManagementService) {}

  @Patch(':companyId') @RequirePermission('company:write')
  updateCompany(@Param('companyId') companyId: string, @Body() dto: CompanyEditDto, @Req() req: any) { return this.service.updateCompany(req.authContext, companyId, dto.name, dto.code); }

  @Delete(':companyId') @RequirePermission('company:write')
  deleteCompany(@Param('companyId') companyId: string, @Req() req: any) { return this.service.deleteCompany(req.authContext, companyId); }

  @Patch('business-units/:businessUnitId') @RequirePermission('company:write')
  updateBusinessUnit(@Param('businessUnitId') id: string, @Body() dto: NameEditDto, @Req() req: any) { return this.service.updateBusinessUnit(req.authContext, id, dto.name); }

  @Delete('business-units/:businessUnitId') @RequirePermission('company:write')
  deleteBusinessUnit(@Param('businessUnitId') id: string, @Req() req: any) { return this.service.deleteBusinessUnit(req.authContext, id); }

  @Patch('plants/:plantId') @RequirePermission('company:write')
  updatePlant(@Param('plantId') id: string, @Body() dto: NameEditDto, @Req() req: any) { return this.service.updatePlant(req.authContext, id, dto.name); }

  @Delete('plants/:plantId') @RequirePermission('company:write')
  deletePlant(@Param('plantId') id: string, @Req() req: any) { return this.service.deletePlant(req.authContext, id); }

  @Patch('locations/:locationId') @RequirePermission('company:write')
  updateLocation(@Param('locationId') id: string, @Body() dto: NameEditDto, @Req() req: any) { return this.service.updateLocation(req.authContext, id, dto.name); }

  @Delete('locations/:locationId') @RequirePermission('company:write')
  deleteLocation(@Param('locationId') id: string, @Req() req: any) { return this.service.deleteLocation(req.authContext, id); }

  @Patch('departments/:departmentId') @RequirePermission('company:write')
  updateDepartment(@Param('departmentId') id: string, @Body() dto: NameEditDto, @Req() req: any) { return this.service.updateDepartment(req.authContext, id, dto.name); }

  @Delete('departments/:departmentId') @RequirePermission('company:write')
  deleteDepartment(@Param('departmentId') id: string, @Req() req: any) { return this.service.deleteDepartment(req.authContext, id); }
}
