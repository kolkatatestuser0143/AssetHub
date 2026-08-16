import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AssetTypeManagementService } from './asset-type-management.service';

class AssetTypeDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() prefix?: string;
  @IsOptional() @IsString() separator?: string;
  @IsOptional() @IsInt() @Min(1) padding?: number;
}

@Controller('assets/types')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetTypeManagementController {
  constructor(private readonly service: AssetTypeManagementService) {}

  @Post() @RequirePermission('asset:write')
  create(@Body() dto: AssetTypeDto, @Req() req: any) {
    return this.service.create(req.authContext, dto.name, dto.prefix, dto.separator, dto.padding);
  }

  @Patch(':assetTypeId') @RequirePermission('asset:write')
  update(@Param('assetTypeId') id: string, @Body() dto: AssetTypeDto, @Req() req: any) {
    return this.service.update(req.authContext, id, dto.name, dto.prefix ?? '', dto.separator, dto.padding);
  }
}
