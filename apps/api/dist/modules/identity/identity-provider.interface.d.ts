export interface NormalizedIdentity {
    externalId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    rawAttributes: Record<string, unknown>;
}
export interface IdentityProvider {
    getAuthorizationUrl(): Promise<string>;
    handleCallback(params: Record<string, unknown>): Promise<NormalizedIdentity>;
    validate(): Promise<{
        ok: boolean;
        errors: string[];
    }>;
}
