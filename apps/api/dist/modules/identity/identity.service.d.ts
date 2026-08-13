import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { IdentitySecurityCacheService } from './identity-security-cache.service';
import { ProvisioningService } from '../auth/provisioning.service';
import { SessionService } from '../auth/session.service';
export declare class IdentityService {
    private readonly db;
    private readonly cache;
    private readonly provisioning;
    private readonly sessions;
    constructor(db: MongooseDatabaseService, cache: IdentitySecurityCacheService, provisioning: ProvisioningService, sessions: SessionService);
    getStartUrl(companyId: string, idpConfigId: string): Promise<string>;
    handleCallback(companyId: string, idpConfigId: string, params: Record<string, unknown>, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    private buildProvider;
}
