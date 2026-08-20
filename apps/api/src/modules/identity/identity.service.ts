import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { IdentitySecurityCacheService } from './identity-security-cache.service';
import { OidcProvider } from './providers/oidc.provider';
import { SamlProvider } from './providers/saml.provider';
import { ProvisioningService } from '../auth/provisioning.service';
import { SessionService } from '../auth/session.service';
import { IdentityProvider } from './identity-provider.interface';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { ScimDeprovisionPolicy } from '../../common/enums';
import { EntitlementService } from '../billing/entitlement.service';
import { IdentitySecretCryptoService } from './identity-secret-crypto.service';

@Injectable()
export class IdentityService {
  constructor(
    private readonly db: PrismaService,
    private readonly cache: IdentitySecurityCacheService,
    private readonly provisioning: ProvisioningService,
    private readonly sessions: SessionService,
    private readonly entitlements: EntitlementService,
    private readonly secretCrypto: IdentitySecretCryptoService,
  ) {}

  async listConfigs(auth: AuthContext, companyId: string) {
    this.requireCompanyScope(auth, companyId);
    await this.entitlements.requireFeature(auth.tenantId, 'sso_enabled');
    const docs = await this.db.identityProviderConfig.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
    return docs.map(doc => ({
      id: doc.id,
      companyId: doc.companyId,
      protocol: doc.protocol,
      name: doc.name,
      isEnabled: doc.isEnabled,
      configKeys: Object.keys(this.secretCrypto.decrypt((doc.config ?? {}) as Record<string, unknown>).config),
      attributeMapping: doc.attributeMapping ?? {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async createConfig(auth: AuthContext, companyId: string, input: { name: string; protocol: 'SAML' | 'OIDC'; config: Record<string, unknown>; attributeMapping: Record<string, string> }) {
    this.requireCompanyScope(auth, companyId);
    await this.entitlements.requireFeature(auth.tenantId, 'sso_enabled');
    const name = input.name.trim();
    if (await this.db.identityProviderConfig.findUnique({ where: { companyId_name: { companyId, name } } })) {
      throw new ConflictException('An identity provider with this name already exists');
    }
    const doc = await this.db.identityProviderConfig.create({ data: {
      companyId,
      protocol: input.protocol,
      name,
      config: this.secretCrypto.encrypt(input.config),
      attributeMapping: input.attributeMapping,
      isEnabled: true,
    } });
    return { id: doc.id, companyId: doc.companyId, protocol: doc.protocol, name: doc.name, isEnabled: doc.isEnabled };
  }

  async setConfigEnabled(auth: AuthContext, companyId: string, idpConfigId: string, enabled: boolean) {
    this.requireCompanyScope(auth, companyId);
    await this.entitlements.requireFeature(auth.tenantId, 'sso_enabled');
    const doc = await this.db.identityProviderConfig.findFirst({ where: { id: idpConfigId, companyId } });
    if (!doc) throw new NotFoundException('Identity provider configuration not found');
    const updated = await this.db.identityProviderConfig.update({ where: { id: doc.id }, data: { isEnabled: enabled } });
    return { id: updated.id, isEnabled: updated.isEnabled };
  }

  async listScimTokens(auth: AuthContext, companyId: string) {
    this.requireCompanyScope(auth, companyId);
    await this.entitlements.requireFeature(auth.tenantId, 'scim_enabled');
    const docs = await this.db.scimToken.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
    return docs.map(doc => ({ id: doc.id, companyId: doc.companyId, label: doc.label ?? null, deprovisionPolicy: doc.deprovisionPolicy, revokedAt: doc.revokedAt ?? null, createdAt: doc.createdAt, active: !doc.revokedAt }));
  }

  async createScimToken(auth: AuthContext, companyId: string, label?: string, deprovisionPolicy: ScimDeprovisionPolicy = ScimDeprovisionPolicy.DISABLE_LOGIN) {
    this.requireCompanyScope(auth, companyId);
    await this.entitlements.requireFeature(auth.tenantId, 'scim_enabled');
    const raw = `scim_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const doc = await this.db.scimToken.create({ data: { companyId, tokenHash, label: label?.trim() || null, deprovisionPolicy } });
    return { id: doc.id, label: doc.label ?? null, deprovisionPolicy: doc.deprovisionPolicy, token: raw, createdAt: doc.createdAt };
  }

  async revokeScimToken(auth: AuthContext, companyId: string, tokenId: string) {
    this.requireCompanyScope(auth, companyId);
    await this.entitlements.requireFeature(auth.tenantId, 'scim_enabled');
    const doc = await this.db.scimToken.findFirst({ where: { id: tokenId, companyId, revokedAt: null } });
    if (!doc) throw new NotFoundException('Active SCIM token not found');
    const updated = await this.db.scimToken.update({ where: { id: doc.id }, data: { revokedAt: new Date() } });
    return { id: updated.id, revokedAt: updated.revokedAt };
  }

  async listScimLogs(auth: AuthContext, companyId: string, limit = 100) {
    this.requireCompanyScope(auth, companyId);
    await this.entitlements.requireFeature(auth.tenantId, 'scim_enabled');
    const tokens = await this.db.scimToken.findMany({ where: { companyId }, select: { id: true } });
    const tokenIds = tokens.map(t => t.id);
    if (!tokenIds.length) return [];
    return this.db.scimSyncLog.findMany({ where: { scimTokenId: { in: tokenIds } }, orderBy: { occurredAt: 'desc' }, take: Math.min(Math.max(limit, 1), 500) });
  }

  async getStartUrl(companyId: string, idpConfigId: string) {
    const company = await this.db.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    await this.entitlements.requireFeature(company.tenantId, 'sso_enabled');
    return (await this.buildProvider(companyId, idpConfigId)).provider.getAuthorizationUrl();
  }

  async handleCallback(companyId: string, idpConfigId: string, params: Record<string, unknown>, ip: string, userAgent: string) {
    const company = await this.db.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    await this.entitlements.requireFeature(company.tenantId, 'sso_enabled');
    const built = await this.buildProvider(companyId, idpConfigId);
    const identity = await built.provider.handleCallback(params);
    const user = await this.provisioning.upsertFromIdentity(companyId, company.tenantId, identity, `SSO:${built.providerName}`);
    if (!user) throw new NotFoundException('Provisioning failed to create user');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    return this.sessions.issueSession(String(user.id), ip, userAgent);
  }

  private requireCompanyScope(auth: AuthContext, companyId: string) {
    if (!auth.crossCompany && auth.companyId !== companyId) throw new UnauthorizedException('Company out of scope');
  }

  private async buildProvider(companyId: string, idpConfigId: string): Promise<{ provider: IdentityProvider; providerName: string }> {
    const config = await this.db.identityProviderConfig.findFirst({ where: { id: idpConfigId, companyId, isEnabled: true } });
    if (!config) throw new NotFoundException('Identity provider not configured or disabled');
    const decrypted = this.secretCrypto.decrypt((config.config ?? {}) as Record<string, unknown>);
    if (!decrypted.encrypted) await this.db.identityProviderConfig.update({ where: { id: config.id }, data: { config: this.secretCrypto.encrypt(decrypted.config) } });
    const mergedConfig = { ...decrypted.config, attributeMapping: config.attributeMapping ?? {} };
    if (config.protocol === 'OIDC') return { provider: new OidcProvider(mergedConfig as never, companyId, this.cache), providerName: config.name };
    if (config.protocol === 'SAML') return { provider: new SamlProvider(mergedConfig as never, companyId, this.cache), providerName: config.name };
    throw new NotFoundException(`Unsupported protocol: ${config.protocol}`);
  }
}
