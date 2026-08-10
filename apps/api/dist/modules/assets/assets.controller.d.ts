import { AssetLifecycleState } from '../../common/enums';
import { AssetsService } from './assets.service';
declare class CreateAssetDto {
    assetTypeId: string;
    fields?: Record<string, unknown>;
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
    transition(assetId: string, dto: TransitionDto, req: any): Promise<{
        ok: boolean;
    }>;
}
export {};
