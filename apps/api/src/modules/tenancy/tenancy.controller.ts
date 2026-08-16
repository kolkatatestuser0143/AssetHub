import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TenancyService } from './tenancy.service';
import { TenantLogoService } from './tenant-logo.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class CreateCompanyDto { @IsString() @MinLength(1) name!: string; @IsString() @MinLength(2) code!: string; }
class CreateSiteDto { @IsString() @MinLength(1) name!: string; @IsOptional() @IsIn(['plant','branch_office','head_office','other']) type?: 'plant' | 'branch_office' | 'head_office' | 'other'; }
class CreateNamedChildDto { @IsString() @MinLength(1) name!: string; }
class TenantProfileDto { @IsOptional() @IsString() @MinLength(2) name?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() website?: string; }
class TenantLogoDto { @IsString() @MinLength(8) fileId!: string; }

@Controller('companies')
@UseGuards(TenantContextGuard, RbacGuard)
export class TenancyController {
  constructor(private readonly tenancy: TenancyService, private readonly logos: TenantLogoService) {}
  @Get('/tenant-profile') @RequirePermission('company:read') profile(@Req() req:any){ return this.tenancy.getTenantProfile(req.authContext); }
  @Get('/tenant-profile/logo-config') @RequirePermission('company:read') logoConfig(){ return this.logos.getClientConfig(); }
  @Patch('/tenant-profile') @RequirePermission('company:write') updateProfile(@Body() dto:TenantProfileDto,@Req() req:any){ return this.tenancy.updateTenantProfile(req.authContext,dto); }
  @Put('/tenant-profile/logo') @RequirePermission('company:write') updateLogo(@Body() dto:TenantLogoDto,@Req() req:any){ return this.logos.setLogo(req.authContext,dto.fileId); }
  @Delete('/tenant-profile/logo') @RequirePermission('company:write') removeLogo(@Req() req:any){ return this.logos.removeLogo(req.authContext); }
  @Get('/hierarchy') @RequirePermission('company:read') hierarchy(@Req() req:any){ return this.tenancy.getAssetHierarchy(req.authContext); }
  @Get() @RequirePermission('company:read') list(@Req() req:any){ return this.tenancy.listCompanies(req.authContext); }
  @Post() @RequirePermission('company:write') create(@Body() dto:CreateCompanyDto,@Req() req:any){ return this.tenancy.createCompany(req.authContext,dto.name,dto.code); }
  @Get(':companyId/sites') @RequirePermission('company:read') listSites(@Param('companyId') companyId:string,@Req() req:any){ return this.tenancy.listPlants(req.authContext,companyId); }
  @Post(':companyId/sites') @RequirePermission('company:write') createSite(@Param('companyId') companyId:string,@Body() dto:CreateSiteDto,@Req() req:any){ return this.tenancy.createPlant(req.authContext,companyId,dto.name,dto.type as any); }
  @Get('sites/:siteId/locations') @RequirePermission('company:read') listLocations(@Param('siteId') siteId:string,@Req() req:any){ return this.tenancy.listLocations(req.authContext,siteId); }
  @Post('sites/:siteId/locations') @RequirePermission('company:write') createLocation(@Param('siteId') siteId:string,@Body() dto:CreateNamedChildDto,@Req() req:any){ return this.tenancy.createLocation(req.authContext,siteId,dto.name); }
  @Get('locations/:locationId/departments') @RequirePermission('company:read') listDepartments(@Param('locationId') locationId:string,@Req() req:any){ return this.tenancy.listDepartments(req.authContext,locationId); }
  @Post('locations/:locationId/departments') @RequirePermission('company:write') createDepartment(@Param('locationId') locationId:string,@Body() dto:CreateNamedChildDto,@Req() req:any){ return this.tenancy.createDepartment(req.authContext,locationId,dto.name); }
}
