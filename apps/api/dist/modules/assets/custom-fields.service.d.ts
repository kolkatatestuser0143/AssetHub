import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
export declare class CustomFieldsService extends TenantScopedRepository {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    listDefinitions(auth: AuthContext): Promise<any[]>;
    createDefinition(auth: AuthContext, key: string, label: string, fieldType: string): Promise<any>;
    updateDefinition(auth: AuthContext, key: string, label?: string, fieldType?: string): Promise<any>;
    deleteDefinition(auth: AuthContext, key: string): Promise<{
        ok: boolean;
    }>;
    getValues(auth: AuthContext, assetId: string): Promise<import("mongoose").FlattenMaps<{
        [x: string]: string;
    }>>;
    setValues(auth: AuthContext, assetId: string, values: Record<string, unknown>): Promise<import("mongoose").FlattenMaps<{
        [x: string]: string;
    }>>;
    clearValue(auth: AuthContext, assetId: string, key: string): Promise<import("mongoose").FlattenMaps<{
        [x: string]: string;
    }>>;
    private validateValue;
    private serializeValue;
}
