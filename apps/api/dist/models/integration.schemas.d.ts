import { HydratedDocument } from 'mongoose';
export declare const IntegrationInstanceModelName = "IntegrationInstance";
export type IntegrationInstanceDocument = HydratedDocument<IntegrationInstance>;
export declare class IntegrationInstance {
    companyId: string;
    kind: string;
    provider: string;
    isMock: boolean;
    credentialRef?: string;
    config?: Record<string, unknown>;
    lastSyncAt?: Date;
    lastSyncStatus?: string;
}
export declare const IntegrationInstanceSchema: import("mongoose").Schema<IntegrationInstance, import("mongoose").Model<IntegrationInstance, any, any, any, import("mongoose").Document<unknown, any, IntegrationInstance, any, {}> & IntegrationInstance & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IntegrationInstance, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<IntegrationInstance>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<IntegrationInstance> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
