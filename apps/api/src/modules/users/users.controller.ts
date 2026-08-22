import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UsersService, UserAdminLevel } from './users.service';
import { UserAsset360Service } from './user-asset-360.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../common/database/prisma.service';

class CreateUserDto { @IsEmail() email!:string; @IsString() @MinLength(1) firstName!:string; @IsString() @MinLength(1) lastName!:string; @IsOptional() @IsString() employeeId?:string; @IsOptional() @IsString() companyId?:string; @IsOptional() @IsString() jobTitle?:string; @IsOptional() @IsString() phone?:string; @IsOptional() @IsString() departmentId?:string; @IsOptional() @IsString() locationId?:string; @IsOptional() @IsIn(['EMPLOYEE','COMPANY_ADMIN','TENANT_ADMIN']) adminLevel?:UserAdminLevel; @IsOptional() @IsArray() @IsString({each:true}) roleIds?:string[]; }
class UpdateUserDto { @IsOptional() @IsEmail() email?:string; @IsOptional() @IsString() @MinLength(1) firstName?:string; @IsOptional() @IsString() @MinLength(1) lastName?:string; @IsOptional() @IsString() employeeId?:string; @IsOptional() @IsString() jobTitle?:string; @IsOptional() @IsString() phone?:string; @IsOptional() @IsString() departmentId?:string; @IsOptional() @IsString() locationId?:string; }
class AccessEmailDto { @IsString() @IsIn(['invite','reset']) action!: 'invite'|'reset'; }
class UpdateRolesDto { @IsArray() @IsString({each:true}) roleIds!:string[]; }
class AdminLevelDto { @IsIn(['EMPLOYEE','COMPANY_ADMIN','TENANT_ADMIN']) adminLevel!:UserAdminLevel; }

@Controller('users') @UseGuards(TenantContextGuard,RbacGuard)
export class UsersController {
 constructor(private readonly users:UsersService,private readonly userAssets:UserAsset360Service,private readonly db:PrismaService){}
 @Get('me') @RequirePermission('user:read') me(@Req() req:any){return this.users.get(req.authContext,req.authContext.userId);}
 @Get('tenant-admins') @RequirePermission('user:read') tenantAdmins(@Req() req:any){return this.users.listTenantAdmins(req.authContext);}
 @Get('employees') @RequirePermission('user:read') employees(@Req() req:any){return this.users.list(req.authContext,'EMPLOYEE');}
 @Get() @RequirePermission('user:read') list(@Query('adminLevel') adminLevel:UserAdminLevel|undefined,@Req() req:any){return this.users.list(req.authContext,adminLevel);}
 @Get(':userId/assets') @RequirePermission('asset:read') assets(@Param('userId') userId:string,@Req() req:any){return this.userAssets.overview(req.authContext,userId);}
 @Get(':userId') @RequirePermission('user:read') get(@Param('userId') userId:string,@Req() req:any){return this.users.get(req.authContext,userId);}
 @Get(':userId/sessions') @RequirePermission('user:read') sessions(@Param('userId') userId:string,@Req() req:any){return this.users.sessions(req.authContext,userId);}
 @Get(':userId/login-history') @RequirePermission('audit:read') loginHistory(@Param('userId') userId:string,@Req() req:any){return this.users.loginHistory(req.authContext,userId);}
 @Post() @RequirePermission('user:write') create(@Body() dto:CreateUserDto,@Req() req:any){return this.users.create(req.authContext,dto);}
 @Patch(':userId') @RequirePermission('user:write') update(@Param('userId') userId:string,@Body() dto:UpdateUserDto,@Req() req:any){return this.users.update(req.authContext,userId,dto);}
 @Patch(':userId/admin-level') @RequirePermission('user:write') changeAdminLevel(@Param('userId') userId:string,@Body() dto:AdminLevelDto,@Req() req:any){return this.users.changeAdminLevel(req.authContext,userId,dto.adminLevel);}
 @Put(':userId/roles') @RequirePermission('role:write') async updateRoles(@Param('userId') userId:string,@Body() dto:UpdateRolesDto,@Req() req:any){if(String(userId)===String(req.authContext.userId))throw new ForbiddenException('You cannot modify your own roles. Ask another tenant administrator or the System Administrator.');const user=await this.db.user.findFirst({where:{id:userId,tenantId:req.authContext.tenantId,accountType:'TENANT',...(req.authContext.crossCompany?{}:{companyId:req.authContext.companyId})}});if(!user)throw new NotFoundException('User not found');const uniqueRoleIds=[...new Set(dto.roleIds.map(id=>String(id).trim()).filter(Boolean))];const roles=uniqueRoleIds.length?await this.db.$queryRawUnsafe<any[]>(`SELECT id,company_id AS "companyId" FROM roles WHERE tenant_id=$1::uuid AND id=ANY($2::uuid[]) AND NOT EXISTS(SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=roles.id AND p.key LIKE 'platform:%')`,req.authContext.tenantId,uniqueRoleIds):[];if(roles.length!==uniqueRoleIds.length)throw new NotFoundException('One or more roles are not available in this tenant');for(const role of roles){if(role.companyId!=null&&String(role.companyId)!==String(user.companyId))throw new ForbiddenException('Role belongs to a different company');if(role.companyId!=null&&!req.authContext.crossCompany&&String(role.companyId)!==String(req.authContext.companyId))throw new ForbiddenException('Role belongs to a different company');}return this.db.user.update({where:{id:userId},data:{roleIds:uniqueRoleIds,authVersion:{increment:1}}});}
 @Post(':userId/access-email') @RequirePermission('user:write') sendAccessEmail(@Param('userId') userId:string,@Body() dto:AccessEmailDto,@Req() req:any){return this.users.sendAccessEmail(req.authContext,userId,dto.action);}
 @Patch(':userId/activate') @RequirePermission('user:write') activate(@Param('userId') userId:string,@Req() req:any){return this.users.setActive(req.authContext,userId,true);}
 @Patch(':userId/deactivate') @RequirePermission('user:write') deactivate(@Param('userId') userId:string,@Req() req:any){return this.users.setActive(req.authContext,userId,false);}
 @Patch(':userId/sessions/:sessionId/revoke') @RequirePermission('user:write') revokeSession(@Param('userId') userId:string,@Param('sessionId') sessionId:string,@Req() req:any){return this.users.revokeSession(req.authContext,userId,sessionId,req.authContext.userId);}
}
