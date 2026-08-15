import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthContext, TenantAuth } from '../../common/guards/tenant-context.guard';
import { AssetMaintenanceService, MaintenanceType } from './asset-maintenance.service';

class MaintenanceDto {
  @IsDateString() serviceDate!: string;
  @IsIn(['REPAIR', 'PREVENTIVE', 'INSPECTION', 'OTHER']) serviceType!: MaintenanceType;
  @IsOptional() @IsString() @MaxLength(200) provider?: string;
  @IsOptional() @IsString() @MaxLength(200) technician?: string;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsOptional() @IsDateString() nextServiceDate?: string;
  @IsOptional() @IsString() attachmentDocumentId?: string;
}

@Controller('assets/:assetId/maintenance')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetMaintenanceController {
  constructor(private readonly maintenance: AssetMaintenanceService) {}

  @Get()
  @RequirePermission('asset:read')
  list(@TenantAuth() auth: AuthContext, @Param('assetId') assetId: string) {
    return this.maintenance.list(auth, assetId);
  }

  @Post()
  @RequirePermission('asset:write')
  create(@TenantAuth() auth: AuthContext, @Param('assetId') assetId: string, @Body() dto: MaintenanceDto) {
    return this.maintenance.create(auth, assetId, dto);
  }

  @Patch(':recordId')
  @RequirePermission('asset:write')
  update(@TenantAuth() auth: AuthContext, @Param('assetId') assetId: string, @Param('recordId') recordId: string, @Body() dto: Partial<MaintenanceDto>) {
    return this.maintenance.update(auth, assetId, recordId, dto);
  }

  @Delete(':recordId')
  @RequirePermission('asset:write')
  remove(@TenantAuth() auth: AuthContext, @Param('assetId') assetId: string, @Param('recordId') recordId: string) {
    return this.maintenance.remove(auth, assetId, recordId);
  }
}
