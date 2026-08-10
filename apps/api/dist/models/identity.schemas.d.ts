import { HydratedDocument } from 'mongoose';
export declare const IdentityProviderConfigModelName = "IdentityProviderConfig";
export type IdentityProviderConfigDocument = HydratedDocument<IdentityProviderConfig>;
export declare class IdentityProviderConfig {
    companyId: string;
    protocol: string;
    name: string;
    config: Record<string, unknown>;
    attributeMapping: Record<string, string>;
    isEnabled: boolean;
}
export declare const IdentityProviderConfigSchema: import("mongoose").Schema<IdentityProviderConfig, import("mongoose").Model<IdentityProviderConfig, any, any, any, import("mongoose").Document<unknown, any, IdentityProviderConfig, any, {}> & IdentityProviderConfig & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IdentityProviderConfig, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<IdentityProviderConfig>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<IdentityProviderConfig> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const ScimTokenModelName = "ScimToken";
export type ScimTokenDocument = HydratedDocument<ScimToken>;
export declare class ScimToken {
    companyId: string;
    tokenHash: string;
    label?: string;
    deprovisionPolicy: string;
    revokedAt?: Date;
}
export declare const ScimTokenSchema: import("mongoose").Schema<ScimToken, import("mongoose").Model<ScimToken, any, any, any, import("mongoose").Document<unknown, any, ScimToken, any, {}> & ScimToken & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ScimToken, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ScimToken>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ScimToken> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const ScimSyncLogModelName = "ScimSyncLog";
export type ScimSyncLogDocument = HydratedDocument<ScimSyncLog>;
export declare class ScimSyncLog {
    scimTokenId: string;
    operation: string;
    externalId?: string;
    payloadHash: string;
    success: boolean;
    errorMessage?: string;
    occurredAt: Date;
}
export declare const ScimSyncLogSchema: import("mongoose").Schema<ScimSyncLog, import("mongoose").Model<ScimSyncLog, any, any, any, import("mongoose").Document<unknown, any, ScimSyncLog, any, {}> & ScimSyncLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ScimSyncLog, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ScimSyncLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ScimSyncLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
