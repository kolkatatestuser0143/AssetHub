import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { IdentitySecurityCacheService } from './identity-security-cache.service';
import { OidcProvider } from './providers/oidc.provider';
import { SamlProvider } from './providers/saml.provider';
import { ProvisioningService } from '../auth/provisioning.service';
import { SessionService } from '../auth/session.service';
import { IdentityProvider } from './identity-provider.interface';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { ScimDeprovisionPolicy } from '../../common/enums';
import { toDtoArray } from '../../common/mongoose.utils';

@Injectable()
export class IdentityService {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly cache: IdentitySecurityCacheService,
    private readonly provisioning: ProvisioningService,
    private readonly sessions: SessionService,
  ) {}

  async listConfigs(auth: AuthContext, companyId: string) {
    this.requireCompanyScope(auth, companyId);
    const docs = await this.db.identityProviderConfig.find({ companyId }).sort({ createdAt: -1 }).lean();
    return docs.map((doc: any) => ({
      id: String(doc._id),
      companyId: doc.companyId,
      protocol: doc.protocol,
      name: doc.name,
      isEnabled: doc.isEnabled,
      configKeys: Object.keys(doc.config ?? {}),
      attributeMapping: doc.attributeMapping ?? {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async createConfig(auth: AuthContext, companyId: string, input: { name: string; protocol: 'SAML' | 'OIDC'; config: Record<string, unknown>; attributeMapping: Record<string, string> }) {
    this.requireCompanyScope(auth, companyId);
    const exists = await this.db.identityProviderConfig.findOne({ companyId, name: input.name.trim() }).lean();
    if (exists) throw new ConflictException('An identity provider with this name already exists');
    const doc = await this.db.identityProviderConfig.create({
      companyId,
      protocol: input.protocol,
      name: input.name.trim(),
      config: input.config,
      attributeMapping: input.attributeMapping,
      isEnabled: true,
    });
    return { id: String(doc._id), companyId: doc.companyId, protocol: doc.protocol, name: doc.name, isEnabled: doc.isEnabled };
  }

  async setConfigEnabled(auth: AuthContext, companyId: string, idpConfigId: string, enabled: boolean) {
    this.requireCompanyScope(auth, companyId);
    const doc = await this.db.identityProviderConfig.findOneAndUpdate(
      { _id: idpConfigId, companyId },
      { $set: { isEnabled: enabled } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('Identity provider configuration not found');
    return { id: String(doc._id), isEnabled: doc.isEnabled };
  }

  async listScimTokens(auth: AuthContext, companyId: string) {
    this.requireCompanyScope(auth, companyId);
    const docs = await this.db.scimToken.find({ companyId }).sort({ createdAt: -1 }).lean();
    return docs.map((doc: any) => ({
      id: String(doc._id),
      companyId: doc.companyId,
      label: doc.label ?? null,
      deprovisionPolicy: doc.deprovisionPolicy,
      revokedAt: doc.revokedAt ?? null,
      createdAt: doc.createdAt,
      active: !doc.revokedAt,
    }));
  }

  async createScimToken(auth: AuthContext, companyId: string, label?: string, deprovisionPolicy: ScimDeprovisionPolicy = ScimDeprovisionPolicy.DISABLE_LOGIN) {
    this.requireCompanyScope(auth, companyId);
    const raw = `scim_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const doc = await this.db.scimToken.create({ companyId, tokenHash, label: label?.trim() || undefined, deprovisionPolicy });
    return { id: String(doc._id), label: doc.label ?? null, deprovisionPolicy: doc.deprovisionPolicy, token: raw, createdAt: doc.createdAt };
  }

  async revokeScimToken(auth: AuthContext, companyId: string, tokenId: string) {
    this.requireCompanyScope(auth, companyId);
    const doc = await this.db.scimToken.findOneAndUpdate(
      { _id: tokenId, companyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('Active SCIM token not found');
    return { id: String(doc._id), revokedAt: doc.revokedAt };
  }

  async listScimLogs(auth: AuthContext, companyId: string, limit = 100) {
    this.requireCompanyScope(auth, companyId);
    const tokens = await this.db.scimToken.find({ companyId }).select({ _id: 1 }).lean();
    const tokenIds = tokens.map((token: any) => String(token._id));
    if (!tokenIds.length) return [];
    const docs = await this.db.scimSyncLog.find({ scimTokenId: { $in: tokenIds } }).sort({ occurredAt: -1 }).limit(Math.min(Math.max(limit, 1), 500)).lean();
    return toDtoArray(docs);
  }

  async getStartUrl(companyId: string, idpConfigId: string): Promise<string> {
    const provider = await this.buildProvider(companyId, idpConfigId);
    return provider.getAuthorizationUrl();
  }

  async handleCallback(
    companyId: string,
    idpConfigId: string,
    params: Record<string, unknown>,
    ip: string,
    userAgent: string,
  ) {
    const provider = await this.buildProvider(companyId, idpConfigId);
    const identity = await provider.handleCallback(params);
    const company = await this.db.company.findById(companyId).lean();
    if (!company) throw new NotFoundException('Company not found');
    const user = await this.provisioning.upsertFromIdentity(companyId, company.tenantId, identity);
    if (!user) throw new NotFoundException('Provisioning failed to create user');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    return this.sessions.issueSession(String(user._id), ip, userAgent);
  }

  private requireCompanyScope(auth: AuthContext, companyId: string) {
    if (!auth.crossCompany && auth.companyId !== companyId) throw new UnauthorizedException('Company out of scope');
  }

  private async buildProvider(companyId: string, idpConfigId: string): Promise<IdentityProvider> {
    const config = await this.db.identityProviderConfig
      .findOne({ _id: idpConfigId, companyId, isEnabled: true })
      .lean();
    if (!config) throw new NotFoundException('Identity provider not configured or disabled');
    const mergedConfig = { ...(config.config ?? {}), attributeMapping: config.attributeMapping ?? {} };
    if (config.protocol === 'OIDC') return new OidcProvider(mergedConfig as never, companyId, this.cache);
    if (config.protocol === 'SAML') return new SamlProvider(mergedConfig as never, companyId, this.cache);
    throw new NotFoundException(`Unsupported protocol: ${config.protocol}`);
  }
}
