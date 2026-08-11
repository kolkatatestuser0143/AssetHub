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
export declare class AssetsController {
    private readonly assets;
    constructor(assets: AssetsService);
    list(req: any): Promise<any[]>;
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
