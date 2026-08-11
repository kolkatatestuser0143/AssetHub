import { SAML } from '@node-saml/node-saml';
import { IdentityProvider, NormalizedIdentity } from '../identity-provider.interface';
import { IdentitySecurityCacheService } from '../identity-security-cache.service';

export interface SamlConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
  attributeMapping: Record<string, string>;
}

export class SamlProvider implements IdentityProvider {
  private saml: SAML | null = null;

  constructor(
    private readonly config: SamlConfig,
    private readonly companyId: string,
    private readonly cache: IdentitySecurityCacheService,
  ) {}

  private getSaml(): SAML {
    if (this.saml) return this.saml;
    if (!this.config.cert) {
      throw new Error('IdP signing certificate is required');
    }
    if (!this.config.entryPoint) {
      throw new Error('entryPoint (IdP SSO URL) is required');
    }

    this.saml = new SAML({
      entryPoint: this.config.entryPoint,
      issuer: this.config.issuer,
      cert: this.config.cert,
      callbackUrl: this.config.callbackUrl,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
    });
    return this.saml;
  }

  async getAuthorizationUrl(): Promise<string> {
    return this.getSaml().getAuthorizeUrlAsync('', '', {});
  }

  async handleCallback(params: { SAMLResponse: string }): Promise<NormalizedIdentity> {
    const { profile } = await this.getSaml().validatePostResponseAsync({ SAMLResponse: params.SAMLResponse });
    if (!profile) {
      throw new Error('SAML response produced no profile — rejected');
    }

    const assertionId = (profile as any).inResponseTo ?? (profile as any).sessionIndex ?? profile.nameID;
    const firstUse = await this.cache.setOnce(`saml-assertion:${this.companyId}:${assertionId}`, 300);
    if (!firstUse) {
      throw new Error('SAML assertion replay detected — rejected');
    }

    const rawAttributes = (profile.attributes ?? {}) as Record<string, unknown>;
    const mapped = this.applyAttributeMapping(rawAttributes);

    return {
      externalId: profile.nameID,
      email: mapped.email ?? profile.nameID,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      rawAttributes,
    };
  }

  async validate(): Promise<{ ok: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!this.config.cert) errors.push('IdP signing certificate is required');
    if (!this.config.entryPoint) errors.push('entryPoint (IdP SSO URL) is required');
    return { ok: errors.length === 0, errors };
  }

  private applyAttributeMapping(attrs: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [providerAttr, internalField] of Object.entries(this.config.attributeMapping)) {
      if (attrs[providerAttr] != null) result[internalField] = String(attrs[providerAttr]);
    }
    return result;
  }
}
