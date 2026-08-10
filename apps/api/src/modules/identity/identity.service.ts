import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { IdentitySecurityCacheService } from './identity-security-cache.service';
import { OidcProvider } from './providers/oidc.provider';
import { SamlProvider } from './providers/saml.provider';
import { ProvisioningService } from '../auth/provisioning.service';
import { SessionService } from '../auth/session.service';
import { IdentityProvider } from './identity-provider.interface';

@Injectable()
export class IdentityService {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly cache: IdentitySecurityCacheService,
    private readonly provisioning: ProvisioningService,
    private readonly sessions: SessionService,
  ) {}

  async getStartUrl(companyId: string, idpConfigId: string): Promise<string> {
    const provider = await this.buildProvider(companyId, idpConfigId);
    return provider.getAuthorizationUrl();
  }

  /**
   * Full SSO login: validate the assertion/token (delegated to the
   * provider), provision/update the user (delegated to
   * ProvisioningService — the ONE place users get created from
   * external identity), then issue a real session (delegated to
   * SessionService — the SAME session-issuing path password login
   * uses). No separate, parallel "SSO session" logic exists.
   */
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

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.sessions.issueSession(String(user._id), ip, userAgent);
  }

  private async buildProvider(companyId: string, idpConfigId: string): Promise<IdentityProvider> {
    const config = await this.db.identityProviderConfig
      .findOne({ _id: idpConfigId, companyId, isEnabled: true })
      .lean();
    if (!config) throw new NotFoundException('Identity provider not configured or disabled');

    const mergedConfig = {
      ...(config.config ?? {}),
      attributeMapping: config.attributeMapping ?? {},
    };

    if (config.protocol === 'OIDC') {
      return new OidcProvider(mergedConfig as never, companyId, this.cache);
    }
    if (config.protocol === 'SAML') {
      return new SamlProvider(mergedConfig as never, companyId, this.cache);
    }
    throw new NotFoundException(`Unsupported protocol: ${config.protocol}`);
  }
}
