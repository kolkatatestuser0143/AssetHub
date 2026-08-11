import { WarrantyService } from './warranty.service';
declare class WarrantyDto {
    provider?: string;
    expiresAt?: string;
}
export declare class WarrantyController {
    private readonly warranty;
    constructor(warranty: WarrantyService);
    get(assetId: string, req: any): Promise<any>;
    upsert(assetId: string, dto: WarrantyDto, req: any): Promise<any>;
    remove(assetId: string, req: any): Promise<{
        ok: boolean;
    }>;
}
export {};
