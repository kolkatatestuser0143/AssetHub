import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { TenancyService } from './tenancy.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class CreateCompanyDto { @IsString() @MinLength(1) name!: string; @IsString() @MinLength(2) code!: string; }
class CreateNamedChildDto { @IsString() @MinLength(1) name!: string; }
class TenantProfileDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() website?: string;
}
class TenantLogoDto { @IsString() @MinLength(8) fileId!: string; }

@Controller('companies')
@UseGuards(TenantContextGuard, RbacGuard)
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get('/tenant-profile') @RequirePermission('company:read')
  profile(@Req() req:any){ return this.tenancy.getTenantProfile(req.authContext); }

  @Patch('/tenant-profile') @RequirePermission('company:write')
  updateProfile(@Body() dto:TenantProfileDto,@Req() req:any){ return this.tenancy.updateTenantProfile(req.authContext,dto); }

  @Put('/tenant-profile/logo') @RequirePermission('company:write')
  updateLogo(@Body() dto:TenantLogoDto,@Req() req:any){ return this.tenancy.updateTenantLogo(req.authContext,dto.fileId); }

  @Delete('/tenant-profile/logo') @RequirePermission('company:write')
  removeLogo(@Req() req:any){ return this.tenancy.removeTenantLogo(req.authContext); }

  @Get() @RequirePermission('company:read')
  list(@Req() req:any){return this.tenancy.listCompanies(req.authContext);}
  @Post() @RequirePermission('company:write')
  create(@Body() dto:CreateCompanyDto,@Req() req:any){return this.tenancy.createCompany(req.authContext,dto.name,dto.code);}
  @Post(':companyId/business-units') @RequirePermission('company:write')
  createBusinessUnit(@Param('companyId') companyId:string,@Body() dto:CreateNamedChildDto,@Req() req:any){return this.tenancy.createBusinessUnit(req.authContext,companyId,dto.name);}
  @Post('business-units/:businessUnitId/plants') @RequirePermission('company:write')
  createPlant(@Param('businessUnitId') businessUnitId:string,@Body() dto:CreateNamedChildDto,@Req() req:any){return this.tenancy.createPlant(req.authContext,businessUnitId,dto.name);}
  @Post('plants/:plantId/locations') @RequirePermission('company:write')
  createLocation(@Param('plantId') plantId:string,@Body() dto:CreateNamedChildDto,@Req() req:any){return this.tenancy.createLocation(req.authContext,plantId,dto.name);}
  @Post('locations/:locationId/departments') @RequirePermission('company:write')
  createDepartment(@Param('locationId') locationId:string,@Body() dto:CreateNamedChildDto,@Req() req:any){return this.tenancy.createDepartment(req.authContext,locationId,dto.name);}
}
