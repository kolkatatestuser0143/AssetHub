import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { AssetLifecycleState } from '../../common/enums';
export declare class AssetsService {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    listAssets(auth: AuthContext): Promise<any[]>;
    listAssetTypes(auth: AuthContext): Promise<any[]>;
    createAssetType(auth: AuthContext, name: string, numberingRule: {
        prefix: string;
        separator?: string;
        padding?: number;
    }): Promise<any>;
    createAsset(auth: AuthContext, assetTypeId: string, fields: Record<string, unknown>): Promise<any>;
    private generateAssetNumber;
    transitionState(auth: AuthContext, assetId: string, toState: AssetLifecycleState, actorUserId: string, reason?: string): Promise<{
        ok: boolean;
    }>;
    private scope;
}
