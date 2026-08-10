import { IdentityProvider, NormalizedIdentity } from '../identity-provider.interface';
import { IdentitySecurityCacheService } from '../identity-security-cache.service';
export interface OidcConfig {
    issuerUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    attributeMapping: Record<string, string>;
}
export declare class OidcProvider implements IdentityProvider {
    private readonly config;
    private readonly companyId;
    private readonly cache;
    private client;
    constructor(config: OidcConfig, companyId: string, cache: IdentitySecurityCacheService);
    private getClient;
    getAuthorizationUrl(): Promise<string>;
    handleCallback(params: {
        code: string;
        state: string;
    }): Promise<NormalizedIdentity>;
    validate(): Promise<{
        ok: boolean;
        errors: string[];
    }>;
    private applyAttributeMapping;
}
