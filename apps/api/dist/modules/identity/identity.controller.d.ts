import { IdentityService } from './identity.service';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
declare class CreateIdpConfigDto {
    name: string;
    protocol: 'SAML' | 'OIDC';
    config: Record<string, unknown>;
    attributeMapping: Record<string, string>;
}
export declare class IdentityController {
    private readonly identity;
    private readonly db;
    constructor(identity: IdentityService, db: MongooseDatabaseService);
    createConfig(companyId: string, dto: CreateIdpConfigDto, req: any): Promise<{
        companyId: string;
        protocol: string;
        name: string;
        config: Record<string, unknown>;
        attributeMapping: Record<string, string>;
        isEnabled: boolean;
        _id: import("mongoose").Types.ObjectId;
        __v: number;
        id: string;
    }>;
    startLogin(companyId: string, idpConfigId: string): Promise<{
        url: string;
    }>;
    samlCallback(companyId: string, idpConfigId: string, body: {
        SAMLResponse: string;
    }, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    oidcCallback(companyId: string, idpConfigId: string, query: {
        code: string;
        state: string;
    }, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
}
export {};
