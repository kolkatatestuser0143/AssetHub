import { AssetLifecycleState } from '../../common/enums';
import { AssetsService } from './assets.service';
declare class CreateAssetDto {
    assetTypeId: string;
    locationId?: string;
    departmentId?: string;
    vendorId?: string;
    fields?: Record<string, unknown>;
}
declare class AssignAssetDto {
    userId: string;
    notes?: string;
}
declare class TransitionDto {
    toState: AssetLifecycleState;
    reason?: string;
}
declare class CreateAssetTypeDto {
    name: string;
    prefix: string;
    separator?: string;
    padding?: number;
}
declare class VendorDto {
    name: string;
    contact?: string;
}
export declare class AssetsController {
    private readonly assets;
    constructor(assets: AssetsService);
    list(req: any): Promise<any[]>;
    listAssignments(req: any): Promise<any[]>;
    reportSummary(req: any): Promise<{
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
    listVendors(req: any): Promise<any[]>;
    createVendor(dto: VendorDto, req: any): Promise<any>;
    updateVendor(vendorId: string, dto: VendorDto, req: any): Promise<any>;
    deleteVendor(vendorId: string, req: any): Promise<{
        ok: boolean;
    }>;
    listWarranties(req: any): Promise<any[]>;
    listTypes(req: any): Promise<any[]>;
    createType(dto: CreateAssetTypeDto, req: any): Promise<any>;
    create(dto: CreateAssetDto, req: any): Promise<any>;
    assign(assetId: string, dto: AssignAssetDto, req: any): Promise<any>;
    currentAssignment(assetId: string, req: any): Promise<any>;
    unassign(assetId: string, dto: AssignAssetDto, req: any): Promise<any>;
    history(assetId: string, req: any): Promise<any[]>;
    transition(assetId: string, dto: TransitionDto, req: any): Promise<{
        ok: boolean;
    }>;
}
export {};
