import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
export declare class WarrantyService extends TenantScopedRepository {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    get(auth: AuthContext, assetId: string): Promise<any>;
    upsert(auth: AuthContext, assetId: string, provider?: string, expiresAt?: Date): Promise<any>;
    remove(auth: AuthContext, assetId: string): Promise<{
        ok: boolean;
    }>;
    private requireAsset;
}
