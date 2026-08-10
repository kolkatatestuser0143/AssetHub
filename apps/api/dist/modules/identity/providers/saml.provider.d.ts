import { IdentityProvider, NormalizedIdentity } from '../identity-provider.interface';
import { IdentitySecurityCacheService } from '../identity-security-cache.service';
export interface SamlConfig {
    entryPoint: string;
    issuer: string;
    cert: string;
    callbackUrl: string;
    attributeMapping: Record<string, string>;
}
export declare class SamlProvider implements IdentityProvider {
    private readonly config;
    private readonly companyId;
    private readonly cache;
    private saml;
    constructor(config: SamlConfig, companyId: string, cache: IdentitySecurityCacheService);
    getAuthorizationUrl(): Promise<string>;
    handleCallback(params: {
        SAMLResponse: string;
    }): Promise<NormalizedIdentity>;
    validate(): Promise<{
        ok: boolean;
        errors: string[];
    }>;
    private applyAttributeMapping;
}
