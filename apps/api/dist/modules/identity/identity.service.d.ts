import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { IdentitySecurityCacheService } from './identity-security-cache.service';
import { ProvisioningService } from '../auth/provisioning.service';
import { SessionService } from '../auth/session.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { ScimDeprovisionPolicy } from '../../common/enums';
export declare class IdentityService {
    private readonly db;
    private readonly cache;
    private readonly provisioning;
    private readonly sessions;
    constructor(db: MongooseDatabaseService, cache: IdentitySecurityCacheService, provisioning: ProvisioningService, sessions: SessionService);
    listConfigs(auth: AuthContext, companyId: string): Promise<{
        id: string;
        companyId: any;
        protocol: any;
        name: any;
        isEnabled: any;
        configKeys: string[];
        attributeMapping: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    createConfig(auth: AuthContext, companyId: string, input: {
        name: string;
        protocol: 'SAML' | 'OIDC';
        config: Record<string, unknown>;
        attributeMapping: Record<string, string>;
    }): Promise<{
        id: string;
        companyId: string;
        protocol: string;
        name: string;
        isEnabled: boolean;
    }>;
    setConfigEnabled(auth: AuthContext, companyId: string, idpConfigId: string, enabled: boolean): Promise<{
        id: string;
        isEnabled: boolean;
    }>;
    listScimTokens(auth: AuthContext, companyId: string): Promise<{
        id: string;
        companyId: any;
        label: any;
        deprovisionPolicy: any;
        revokedAt: any;
        createdAt: any;
        active: boolean;
    }[]>;
    createScimToken(auth: AuthContext, companyId: string, label?: string, deprovisionPolicy?: ScimDeprovisionPolicy): Promise<{
        id: string;
        label: string | null;
        deprovisionPolicy: string;
        token: string;
        createdAt: Date;
    }>;
    revokeScimToken(auth: AuthContext, companyId: string, tokenId: string): Promise<{
        id: string;
        revokedAt: Date | undefined;
    }>;
    listScimLogs(auth: AuthContext, companyId: string, limit?: number): Promise<any[]>;
    getStartUrl(companyId: string, idpConfigId: string): Promise<string>;
    handleCallback(companyId: string, idpConfigId: string, params: Record<string, unknown>, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    private requireCompanyScope;
    private buildProvider;
}
