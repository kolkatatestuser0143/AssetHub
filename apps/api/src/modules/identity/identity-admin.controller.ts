import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ScimDeprovisionPolicy } from '../../common/enums';
import { IdentityService } from './identity.service';

class CreateScimTokenDto { @IsOptional() @IsString() label?: string; @IsOptional() @IsIn(Object.values(ScimDeprovisionPolicy)) deprovisionPolicy?: ScimDeprovisionPolicy; }

@Controller('identity-admin')
@UseGuards(TenantContextGuard, RbacGuard)
export class IdentityAdminController {
  constructor(private readonly identity: IdentityService) {}

  @Get(':companyId/providers') @RequirePermission('identity_provider:read') listProviders(@Param('companyId') companyId: string, @Req() req: any) { return this.identity.listConfigs(req.authContext, companyId); }

  @Patch(':companyId/providers/:idpConfigId/enable') @RequirePermission('identity_provider:write') enableProvider(@Param('companyId') companyId: string, @Param('idpConfigId') idpConfigId: string, @Req() req: any) { return this.identity.setConfigEnabled(req.authContext, companyId, idpConfigId, true); }

  @Patch(':companyId/providers/:idpConfigId/disable') @RequirePermission('identity_provider:write') disableProvider(@Param('companyId') companyId: string, @Param('idpConfigId') idpConfigId: string, @Req() req: any) { return this.identity.setConfigEnabled(req.authContext, companyId, idpConfigId, false); }

  @Get(':companyId/users/:userId') @RequirePermission('user:read') getEmployeeIdentity(@Param('userId') userId: string, @Req() req: any) { return this.identity.getEmployeeIdentity(req.authContext, userId); }

  @Get(':companyId/scim/tokens') @RequirePermission('scim:manage') listScimTokens(@Param('companyId') companyId: string, @Req() req: any) { return this.identity.listScimTokens(req.authContext, companyId); }
  @Post(':companyId/scim/tokens') @RequirePermission('scim:manage') createScimToken(@Param('companyId') companyId: string, @Body() dto: CreateScimTokenDto, @Req() req: any) { return this.identity.createScimToken(req.authContext, companyId, dto.label, dto.deprovisionPolicy); }
  @Patch(':companyId/scim/tokens/:tokenId/revoke') @RequirePermission('scim:manage') revokeScimToken(@Param('companyId') companyId: string, @Param('tokenId') tokenId: string, @Req() req: any) { return this.identity.revokeScimToken(req.authContext, companyId, tokenId); }
  @Get(':companyId/scim/logs') @RequirePermission('scim:manage') listScimLogs(@Param('companyId') companyId: string, @Query('limit') limit: string | undefined, @Req() req: any) { const parsed = limit ? Number.parseInt(limit, 10) : 100; return this.identity.listScimLogs(req.authContext, companyId, Number.isFinite(parsed) ? parsed : 100); }
}
