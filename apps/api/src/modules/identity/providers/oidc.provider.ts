import { Issuer, generators, Client } from 'openid-client';
import { IdentityProvider, NormalizedIdentity } from '../identity-provider.interface';
import { IdentitySecurityCacheService } from '../identity-security-cache.service';

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  attributeMapping: Record<string, string>;
}

export class OidcProvider implements IdentityProvider {
  private client: Client | null = null;

  constructor(
    private readonly config: OidcConfig,
    private readonly companyId: string,
    private readonly cache: IdentitySecurityCacheService,
  ) {}

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    const issuer = await Issuer.discover(this.config.issuerUrl);
    this.client = new issuer.Client({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uris: [this.config.redirectUri],
      response_types: ['code'],
    });
    return this.client;
  }

  async getAuthorizationUrl(): Promise<string> {
    const client = await this.getClient();
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    await this.cache.storeValue(
      `oidc:${this.companyId}:${state}`,
      JSON.stringify({ nonce, codeVerifier }),
      600,
    );

    return client.authorizationUrl({
      scope: 'openid email profile', state, nonce,
      code_challenge: codeChallenge, code_challenge_method: 'S256',
    });
  }

  async handleCallback(params: { code: string; state: string }): Promise<NormalizedIdentity> {
    // Reject forged/expired state before any network discovery or token exchange.
    const cached = await this.cache.takeValue(`oidc:${this.companyId}:${params.state}`);
    if (!cached) {
      throw new Error('Invalid or expired OIDC state — possible CSRF or replay attempt');
    }
    const { nonce, codeVerifier } = JSON.parse(cached);

    const client = await this.getClient();
    const tokenSet = await client.callback(this.config.redirectUri, params, {
      state: params.state,
      nonce,
      code_verifier: codeVerifier,
    });

    const claims = tokenSet.claims();
    const mapped = this.applyAttributeMapping(claims as Record<string, unknown>);

    return {
      externalId: claims.sub,
      email: mapped.email ?? (claims.email as string),
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      rawAttributes: claims as Record<string, unknown>,
    };
  }

  async validate(): Promise<{ ok: boolean; errors: string[] }> {
    try {
      await Issuer.discover(this.config.issuerUrl);
      return { ok: true, errors: [] };
    } catch (err: any) {
      return { ok: false, errors: [err.message] };
    }
  }

  private applyAttributeMapping(claims: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [providerAttr, internalField] of Object.entries(this.config.attributeMapping)) {
      if (claims[providerAttr] != null) result[internalField] = String(claims[providerAttr]);
    }
    return result;
  }
}
