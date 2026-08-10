import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CustomFieldsService } from './custom-fields.service';

class CustomFieldDefinitionDto {
  @IsString() @Matches(/^[a-z][a-z0-9_.-]{0,63}$/) key!: string;
  @IsString() label!: string;
  @IsString() @IsIn(['text', 'number', 'boolean', 'date']) fieldType!: string;
}

class UpdateCustomFieldDefinitionDto {
  @IsString() @IsOptional() label?: string;
  @IsString() @IsOptional() @IsIn(['text', 'number', 'boolean', 'date']) fieldType?: string;
}

class CustomFieldValuesDto {
  @IsObject() values!: Record<string, unknown>;
}

@Controller()
@UseGuards(TenantContextGuard, RbacGuard)
export class CustomFieldsController {
  constructor(private readonly fields: CustomFieldsService) {}

  @Get('custom-fields')
  @RequirePermission('asset:read')
  listDefinitions(@Req() req: any) {
    return this.fields.listDefinitions(req.authContext);
  }

  @Post('custom-fields')
  @RequirePermission('asset:write')
  createDefinition(@Body() dto: CustomFieldDefinitionDto, @Req() req: any) {
    return this.fields.createDefinition(req.authContext, dto.key, dto.label, dto.fieldType);
  }

  @Put('custom-fields/:key')
  @RequirePermission('asset:write')
  updateDefinition(@Param('key') key: string, @Body() dto: UpdateCustomFieldDefinitionDto, @Req() req: any) {
    return this.fields.updateDefinition(req.authContext, key, dto.label, dto.fieldType);
  }

  @Delete('custom-fields/:key')
  @RequirePermission('asset:write')
  deleteDefinition(@Param('key') key: string, @Req() req: any) {
    return this.fields.deleteDefinition(req.authContext, key);
  }

  @Get('assets/:assetId/custom-fields')
  @RequirePermission('asset:read')
  getValues(@Param('assetId') assetId: string, @Req() req: any) {
    return this.fields.getValues(req.authContext, assetId);
  }

  @Post('assets/:assetId/custom-fields')
  @RequirePermission('asset:write')
  setValues(@Param('assetId') assetId: string, @Body() dto: CustomFieldValuesDto, @Req() req: any) {
    return this.fields.setValues(req.authContext, assetId, dto.values);
  }

  @Delete('assets/:assetId/custom-fields/:key')
  @RequirePermission('asset:write')
  clearValue(@Param('assetId') assetId: string, @Param('key') key: string, @Req() req: any) {
    return this.fields.clearValue(req.authContext, assetId, key);
  }
}
