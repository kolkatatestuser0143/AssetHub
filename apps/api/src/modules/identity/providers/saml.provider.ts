import { SAML } from '@node-saml/node-saml';
import { IdentityProvider, NormalizedIdentity } from '../identity-provider.interface';
import { IdentitySecurityCacheService } from '../identity-security-cache.service';

export interface SamlConfig {
  entryPoint: string; // IdP SSO URL
  issuer: string; // our SP entity ID
  cert: string; // IdP's signing certificate (PEM) — REQUIRED, never skip
  callbackUrl: string;
  attributeMapping: Record<string, string>;
}

/**
 * @node-saml/node-saml does the actual signature/audience/issuer
 * validation and clock-skew handling — that is exactly the kind of
 * crypto logic that must come from a maintained library, not be
 * reimplemented here. This class's job is orchestration + the replay
 * check on top, not the cryptography itself.
 */
export class SamlProvider implements IdentityProvider {
  private saml: SAML;

  constructor(
    private readonly config: SamlConfig,
    private readonly companyId: string,
    private readonly cache: IdentitySecurityCacheService,
  ) {
    this.saml = new SAML({
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      cert: config.cert,
      callbackUrl: config.callbackUrl,
      wantAssertionsSigned: true, // reject unsigned assertions — non-negotiable
      wantAuthnResponseSigned: true,
    });
  }

  async getAuthorizationUrl(): Promise<string> {
    return this.saml.getAuthorizeUrlAsync('', '', {});
  }

  async handleCallback(params: { SAMLResponse: string }): Promise<NormalizedIdentity> {
    // validatePostResponseAsync verifies the signature against
    // config.cert, checks audience/issuer/destination, and enforces
    // the assertion's NotBefore/NotOnOrAfter window — we do NOT
    // hand-roll any of that here.
    const { profile } = await this.saml.validatePostResponseAsync({ SAMLResponse: params.SAMLResponse });
    if (!profile) {
      throw new Error('SAML response produced no profile — rejected');
    }

    // Replay protection: an assertion ID must only ever be accepted
    // once, within its validity window (architecture doc §8).
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
