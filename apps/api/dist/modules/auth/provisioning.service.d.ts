import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { NormalizedIdentity } from '../identity/identity-provider.interface';
export declare class ProvisioningService {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    upsertFromIdentity(companyId: string, tenantId: string, identity: NormalizedIdentity): Promise<(import("mongoose").FlattenMaps<{
        tenantId: string;
        companyId: string;
        email: string;
        passwordHash?: string | undefined;
        firstName: string;
        lastName: string;
        jobTitle?: string | undefined;
        phone?: string | undefined;
        mfaMethod: string;
        totpSecretEnc?: string | undefined;
        backupCodesHash: string[];
        isActive: boolean;
        forcePasswordReset: boolean;
        externalScimId?: string | undefined;
        roleIds: string[];
        departmentId?: string | undefined;
        locationId?: string | undefined;
    }> & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
}
