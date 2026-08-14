import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() locationId?: string;
}

class AccessEmailDto {
  @IsString() @IsIn(['invite', 'reset']) action!: 'invite' | 'reset';
}

@Controller('users')
@UseGuards(TenantContextGuard, RbacGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @RequirePermission('user:read')
  me(@Req() req: any) {
    return this.users.get(req.authContext, req.authContext.userId);
  }

  @Get()
  @RequirePermission('user:read')
  list(@Req() req: any) {
    return this.users.list(req.authContext);
  }

  @Get(':userId')
  @RequirePermission('user:read')
  get(@Param('userId') userId: string, @Req() req: any) {
    return this.users.get(req.authContext, userId);
  }

  @Get(':userId/sessions')
  @RequirePermission('user:read')
  sessions(@Param('userId') userId: string, @Req() req: any) {
    return this.users.sessions(req.authContext, userId);
  }

  @Get(':userId/login-history')
  @RequirePermission('audit:read')
  loginHistory(@Param('userId') userId: string, @Req() req: any) {
    return this.users.loginHistory(req.authContext, userId);
  }

  @Post()
  @RequirePermission('user:write')
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.users.create(req.authContext, dto);
  }

  @Post(':userId/access-email')
  @RequirePermission('user:write')
  sendAccessEmail(@Param('userId') userId: string, @Body() dto: AccessEmailDto, @Req() req: any) {
    return this.users.sendAccessEmail(req.authContext, userId, dto.action);
  }

  @Patch(':userId/activate')
  @RequirePermission('user:write')
  activate(@Param('userId') userId: string, @Req() req: any) {
    return this.users.setActive(req.authContext, userId, true);
  }

  @Patch(':userId/deactivate')
  @RequirePermission('user:write')
  deactivate(@Param('userId') userId: string, @Req() req: any) {
    return this.users.setActive(req.authContext, userId, false);
  }

  @Patch(':userId/sessions/:sessionId/revoke')
  @RequirePermission('user:write')
  revokeSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.users.revokeSession(
      req.authContext,
      userId,
      sessionId,
      req.authContext.userId,
    );
  }
}
