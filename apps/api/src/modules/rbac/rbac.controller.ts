import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';
import { RbacService } from './rbac.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class CreateRoleDto {
  @IsString() @MinLength(1) name: string;
  @IsArray() @ArrayMinSize(0) permissionKeys: string[];
}

@Controller('roles')
@UseGuards(TenantContextGuard, RbacGuard)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions')
  @RequirePermission('role:read')
  listPermissions() {
    return this.rbac.listPermissions();
  }

  @Get()
  @RequirePermission('role:read')
  listRoles(@Req() req: any) {
    return this.rbac.listRoles(req.authContext);
  }

  @Post()
  @RequirePermission('role:write')
  createRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    return this.rbac.createRole(req.authContext, dto.name, dto.permissionKeys);
  }

  @Post(':roleId/assign/:userId')
  @RequirePermission('role:write')
  assignRole(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.rbac.assignRole(req.authContext, userId, roleId);
  }
}
