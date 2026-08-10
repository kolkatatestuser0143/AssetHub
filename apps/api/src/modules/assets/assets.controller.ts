import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { AssetLifecycleState } from '../../common/enums';
import { AssetsService } from './assets.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class CreateAssetDto {
  @IsString() assetTypeId: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsObject() @IsOptional() fields?: Record<string, unknown>;
}
class TransitionDto {
  @IsIn(Object.values(AssetLifecycleState)) toState: AssetLifecycleState;
  @IsString() @IsOptional() reason?: string;
}
class CreateAssetTypeDto {
  @IsString() name: string;
  @IsString() prefix: string;
  @IsString() @IsOptional() separator?: string;
  @IsInt() @Min(1) @IsOptional() padding?: number;
}

@Controller('assets')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @RequirePermission('asset:read')
  list(@Req() req: any) {
    return this.assets.listAssets(req.authContext);
  }

  @Get('types')
  @RequirePermission('asset:read')
  listTypes(@Req() req: any) {
    return this.assets.listAssetTypes(req.authContext);
  }

  @Post('types')
  @RequirePermission('asset:write')
  createType(@Body() dto: CreateAssetTypeDto, @Req() req: any) {
    return this.assets.createAssetType(req.authContext, dto.name, {
      prefix: dto.prefix,
      separator: dto.separator,
      padding: dto.padding,
    });
  }

  @Post()
  @RequirePermission('asset:write')
  create(@Body() dto: CreateAssetDto, @Req() req: any) {
    return this.assets.createAsset(req.authContext, dto.assetTypeId, {
      locationId: dto.locationId,
      departmentId: dto.departmentId,
      vendorId: dto.vendorId,
      ...(dto.fields ?? {}),
    });
  }

  @Post(':assetId/transition')
  @RequirePermission('asset:write')
  transition(@Param('assetId') assetId: string, @Body() dto: TransitionDto, @Req() req: any) {
    return this.assets.transitionState(req.authContext, assetId, dto.toState, req.authContext.userId, dto.reason);
  }
}
