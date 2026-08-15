import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AssetExcelReportFilters } from './asset-excel-report.service';
import { AssetReportTemplateService } from './asset-report-template.service';

class FiltersDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() assetTypeId?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsISO8601() fromDate?: string;
  @IsOptional() @IsISO8601() toDate?: string;
}

class SaveTemplateDto extends FiltersDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

@Controller('assets/report-templates')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetReportTemplateController {
  constructor(private readonly templates: AssetReportTemplateService) {}

  @Get()
  @RequirePermission('asset:read')
  list(@Req() req: any) { return this.templates.list(req.authContext); }

  @Get(':templateId')
  @RequirePermission('asset:read')
  get(@Param('templateId') templateId: string, @Req() req: any) { return this.templates.get(req.authContext, templateId); }

  @Post()
  @RequirePermission('asset:write')
  create(@Body() dto: SaveTemplateDto, @Req() req: any) {
    return this.templates.create(req.authContext, dto.name, dto.description, this.filters(dto));
  }

  @Patch(':templateId')
  @RequirePermission('asset:write')
  update(@Param('templateId') templateId: string, @Body() dto: SaveTemplateDto, @Req() req: any) {
    return this.templates.update(req.authContext, templateId, dto.name, dto.description, this.filters(dto));
  }

  @Delete(':templateId')
  @RequirePermission('asset:write')
  remove(@Param('templateId') templateId: string, @Req() req: any) {
    return this.templates.remove(req.authContext, templateId);
  }

  private filters(dto: SaveTemplateDto): AssetExcelReportFilters {
    return {
      status: dto.status,
      companyId: dto.companyId,
      assetTypeId: dto.assetTypeId,
      locationId: dto.locationId,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
    };
  }
}
