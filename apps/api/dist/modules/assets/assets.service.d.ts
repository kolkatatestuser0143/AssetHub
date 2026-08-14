import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { AssetLifecycleState } from '../../common/enums';
export declare class AssetsService extends TenantScopedRepository {
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
    listAssignments(auth: AuthContext): Promise<any[]>;
    getReportSummary(auth: AuthContext): Promise<{
        generatedAt: string;
        totals: {
            assets: number;
            assignedAssets: number;
            assignmentRecords: number;
            vendors: number;
            warranties: number;
            expiredWarranties: number;
            expiringWarranties: number;
        };
        statusCounts: Record<string, number>;
        assets: {
            id: string;
            assetNumber: any;
            status: any;
            assetTypeId: string;
            vendorId: string | null;
            warranty: any;
        }[];
    }>;
    getAssetReportCsv(auth: AuthContext): Promise<string>;
    listVendors(auth: AuthContext): Promise<any[]>;
    createVendor(auth: AuthContext, name: string, contact?: string): Promise<any>;
    updateVendor(auth: AuthContext, vendorId: string, name: string, contact?: string): Promise<any>;
    deleteVendor(auth: AuthContext, vendorId: string): Promise<{
        ok: boolean;
    }>;
    listWarranties(auth: AuthContext): Promise<any[]>;
    assignAsset(auth: AuthContext, assetId: string, userId: string, notes?: string): Promise<any>;
    getCurrentAssignment(auth: AuthContext, assetId: string): Promise<any>;
    unassignAsset(auth: AuthContext, assetId: string, notes?: string): Promise<any>;
    listAssignmentHistory(auth: AuthContext, assetId: string): Promise<any[]>;
    private readOptionalId;
    private generateAssetNumber;
    transitionState(auth: AuthContext, assetId: string, toState: AssetLifecycleState, actorUserId: string, reason?: string): Promise<{
        ok: boolean;
    }>;
}
