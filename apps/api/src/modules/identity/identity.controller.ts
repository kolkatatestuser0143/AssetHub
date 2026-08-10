import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Redirect, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsString } from 'class-validator';
import { IdentityService } from './identity.service';
import { PrismaService } from '../../common/prisma.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class CreateIdpConfigDto {
  @IsString() name: string;
  @IsIn(['SAML', 'OIDC']) protocol: 'SAML' | 'OIDC';
  @IsObject() config: Record<string, unknown>;
  @IsObject() attributeMapping: Record<string, string>;
}

@Controller('identity-providers')
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly prisma: PrismaService,
  ) {}

  // --- Admin config management: guarded, tenant-scoped ---

  @Post(':companyId')
  @UseGuards(TenantContextGuard, RbacGuard)
  @RequirePermission('identity_provider:write')
  async createConfig(@Param('companyId') companyId: string, @Body() dto: CreateIdpConfigDto, @Req() req: any) {
    if (!req.authContext.crossCompany && req.authContext.companyId !== companyId) {
      throw new ForbiddenException('Company out of scope');
    }
    return this.prisma.identityProviderConfig.create({
      data: {
        companyId,
        protocol: dto.protocol,
        name: dto.name,
        config: dto.config as any,
        attributeMapping: dto.attributeMapping as any,
      },
    });
  }

  // --- Public SSO flow: unauthenticated by definition, this IS the login ---

  @Get(':companyId/:idpConfigId/login')
  @Redirect()
  async startLogin(@Param('companyId') companyId: string, @Param('idpConfigId') idpConfigId: string) {
    const url = await this.identity.getStartUrl(companyId, idpConfigId);
    return { url };
  }

  @Post(':companyId/:idpConfigId/callback/saml')
  async samlCallback(
    @Param('companyId') companyId: string,
    @Param('idpConfigId') idpConfigId: string,
    @Body() body: { SAMLResponse: string },
    @Req() req: any,
  ) {
    // Returns real { accessToken, refreshToken } now — same shape as
    // POST /auth/login. Frontend should treat this identically.
    return this.identity.handleCallback(companyId, idpConfigId, body, req.ip, req.headers['user-agent'] ?? '');
  }

  @Get(':companyId/:idpConfigId/callback/oidc')
  async oidcCallback(
    @Param('companyId') companyId: string,
    @Param('idpConfigId') idpConfigId: string,
    @Query() query: { code: string; state: string },
    @Req() req: any,
  ) {
    return this.identity.handleCallback(companyId, idpConfigId, query, req.ip, req.headers['user-agent'] ?? '');
  }
}
