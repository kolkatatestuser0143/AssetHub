import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WarrantyService } from './warranty.service';

class WarrantyDto {
  @IsString() @IsOptional() provider?: string;
  @IsDateString() @IsOptional() expiresAt?: string;
}

@Controller('assets/:assetId/warranty')
@UseGuards(TenantContextGuard, RbacGuard)
export class WarrantyController {
  constructor(private readonly warranty: WarrantyService) {}

  @Get()
  @RequirePermission('asset:read')
  get(@Param('assetId') assetId: string, @Req() req: any) {
    return this.warranty.get(req.authContext, assetId);
  }

  @Put()
  @RequirePermission('asset:write')
  upsert(@Param('assetId') assetId: string, @Body() dto: WarrantyDto, @Req() req: any) {
    return this.warranty.upsert(req.authContext, assetId, dto.provider, dto.expiresAt ? new Date(dto.expiresAt) : undefined);
  }

  @Delete()
  @RequirePermission('asset:write')
  remove(@Param('assetId') assetId: string, @Req() req: any) {
    return this.warranty.remove(req.authContext, assetId);
  }
}
