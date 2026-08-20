import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { RbacService, RoleScopeInput } from './rbac.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class CreateRoleDto { @IsString() @MinLength(1) name: string; @IsArray() @ArrayMinSize(0) permissionKeys: string[]; }
class RoleScopesDto {
  @IsArray() scopes: Array<{ @IsIn(['TENANT', 'COMPANY', 'LOCATION']) scopeType: RoleScopeInput['scopeType']; @IsOptional() @IsString() companyId?: string; @IsOptional() @IsString() locationId?: string }>;
}

@Controller('roles')
@UseGuards(TenantContextGuard, RbacGuard)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions') @RequirePermission('role:read') listPermissions() { return this.rbac.listPermissions(); }
  @Get() @RequirePermission('role:read') listRoles(@Req() req: any) { return this.rbac.listRoles(req.authContext); }
  @Post() @RequirePermission('role:write') createRole(@Body() dto: CreateRoleDto, @Req() req: any) { return this.rbac.createRole(req.authContext, dto.name, dto.permissionKeys); }

  @Get(':roleId/scopes') @RequirePermission('role:read') listScopes(@Param('roleId') roleId: string, @Req() req: any) { return this.rbac.listRoleScopes(req.authContext, roleId); }
  @Put(':roleId/scopes') @RequirePermission('role:write') setScopes(@Param('roleId') roleId: string, @Body() dto: RoleScopesDto, @Req() req: any) { return this.rbac.setRoleScopes(req.authContext, roleId, dto.scopes as RoleScopeInput[]); }

  @Post(':roleId/assign/:userId') @RequirePermission('role:write') assignRole(@Param('roleId') roleId: string, @Param('userId') userId: string, @Req() req: any) { return this.rbac.assignRole(req.authContext, userId, roleId); }
  @Delete(':roleId/assign/:userId') @RequirePermission('role:write') unassignRole(@Param('roleId') roleId: string, @Param('userId') userId: string, @Req() req: any) { return this.rbac.unassignRole(req.authContext, userId, roleId); }
}
