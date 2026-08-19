import { Body, Controller, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { UserAsset360Service } from './user-asset-360.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';

class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() locationId?: string;
}

class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) lastName?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() locationId?: string;
}

class AccessEmailDto {
  @IsString() @IsIn(['invite', 'reset']) action!: 'invite' | 'reset';
}

class UpdateRolesDto {
  @IsArray() @IsString({ each: true }) roleIds!: string[];
}

@Controller('users')
@UseGuards(TenantContextGuard, RbacGuard)
export class UsersController {
  constructor(private readonly users: UsersService, private readonly userAssets: UserAsset360Service, private readonly db: MongooseDatabaseService) {}

  @Get('me') @RequirePermission('user:read') me(@Req() req: any) { return this.users.get(req.authContext, req.authContext.userId); }
  @Get() @RequirePermission('user:read') list(@Req() req: any) { return this.users.list(req.authContext); }
  @Get(':userId/assets') @RequirePermission('asset:read') assets(@Param('userId') userId: string, @Req() req: any) { return this.userAssets.overview(req.authContext, userId); }
  @Get(':userId') @RequirePermission('user:read') get(@Param('userId') userId: string, @Req() req: any) { return this.users.get(req.authContext, userId); }
  @Get(':userId/sessions') @RequirePermission('user:read') sessions(@Param('userId') userId: string, @Req() req: any) { return this.users.sessions(req.authContext, userId); }
  @Get(':userId/login-history') @RequirePermission('audit:read') loginHistory(@Param('userId') userId: string, @Req() req: any) { return this.users.loginHistory(req.authContext, userId); }
  @Post() @RequirePermission('user:write') create(@Body() dto: CreateUserDto, @Req() req: any) { return this.users.create(req.authContext, dto); }
  @Patch(':userId') @RequirePermission('user:write') update(@Param('userId') userId: string, @Body() dto: UpdateUserDto, @Req() req: any) { return this.users.update(req.authContext, userId, dto); }
  @Put(':userId/roles') @RequirePermission('role:write') async updateRoles(@Param('userId') userId: string, @Body() dto: UpdateRolesDto, @Req() req: any) {
    const user = await this.db.user.findOne({ _id: userId, ...this.scopeFilter(req.authContext), accountType: 'TENANT' }).lean();
    if (!user) throw new Error('User not found');
    const uniqueRoleIds = [...new Set(dto.roleIds.map((id) => String(id).trim()).filter(Boolean))];
    const roles = uniqueRoleIds.length ? await this.db.role.find({ _id: { $in: uniqueRoleIds }, tenantId: req.authContext.tenantId }).lean() : [];
    if (roles.length !== uniqueRoleIds.length) throw new Error('One or more roles are not available in your tenant');
    for (const role of roles) {
      if (role.companyId != null && String(role.companyId) !== String(user.companyId)) throw new Error('Role belongs to a different company');
      if (role.companyId != null && !req.authContext.crossCompany && String(role.companyId) !== String(req.authContext.companyId)) throw new Error('Role belongs to a different company');
    }
    const updated = await this.db.user.findOneAndUpdate({ _id: userId, ...this.scopeFilter(req.authContext), accountType: 'TENANT' }, { $set: { roleIds: uniqueRoleIds }, $inc: { authVersion: 1 } }, { new: true }).lean();
    if (!updated) throw new Error('User not found');
    return updated;
  }
  @Post(':userId/access-email') @RequirePermission('user:write') sendAccessEmail(@Param('userId') userId: string, @Body() dto: AccessEmailDto, @Req() req: any) { return this.users.sendAccessEmail(req.authContext, userId, dto.action); }
  @Patch(':userId/activate') @RequirePermission('user:write') activate(@Param('userId') userId: string, @Req() req: any) { return this.users.setActive(req.authContext, userId, true); }
  @Patch(':userId/deactivate') @RequirePermission('user:write') deactivate(@Param('userId') userId: string, @Req() req: any) { return this.users.setActive(req.authContext, userId, false); }
  @Patch(':userId/sessions/:sessionId/revoke') @RequirePermission('user:write') revokeSession(@Param('userId') userId: string, @Param('sessionId') sessionId: string, @Req() req: any) { return this.users.revokeSession(req.authContext, userId, sessionId, req.authContext.userId); }

  private scopeFilter(auth: any) {
    return auth.crossCompany ? { tenantId: auth.tenantId } : { tenantId: auth.tenantId, companyId: auth.companyId };
  }
}
