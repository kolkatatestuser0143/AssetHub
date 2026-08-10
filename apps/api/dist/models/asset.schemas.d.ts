import { HydratedDocument } from 'mongoose';
export declare const AssetTypeModelName = "AssetType";
export type AssetTypeDocument = HydratedDocument<AssetType>;
export declare class AssetNumberingRule {
    prefix: string;
    separator: string;
    padding: number;
    nextSequence: number;
}
export declare const AssetNumberingRuleSchema: import("mongoose").Schema<AssetNumberingRule, import("mongoose").Model<AssetNumberingRule, any, any, any, import("mongoose").Document<unknown, any, AssetNumberingRule, any, {}> & AssetNumberingRule & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AssetNumberingRule, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AssetNumberingRule>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AssetNumberingRule> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class AssetType {
    companyId: string;
    name: string;
    numberingRule?: AssetNumberingRule;
}
export declare const AssetTypeSchema: import("mongoose").Schema<AssetType, import("mongoose").Model<AssetType, any, any, any, import("mongoose").Document<unknown, any, AssetType, any, {}> & AssetType & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AssetType, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AssetType>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AssetType> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const AssetModelName = "Asset";
export type AssetDocument = HydratedDocument<Asset>;
export declare class Asset {
    tenantId: string;
    companyId: string;
    assetTypeId: string;
    assetNumber: string;
    serialNumber?: string;
    model?: string;
    status: string;
    locationId?: string;
    departmentId?: string;
    vendorId?: string;
    purchaseDate?: Date;
    warranty?: {
        provider?: string;
        expiresAt?: Date;
    };
    qrCodeUrl?: string;
    barcodeValue?: string;
    customFields?: Record<string, string>;
}
export declare const AssetSchema: import("mongoose").Schema<Asset, import("mongoose").Model<Asset, any, any, any, import("mongoose").Document<unknown, any, Asset, any, {}> & Asset & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Asset, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Asset>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Asset> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const AssetAuditEventModelName = "AssetAuditEvent";
export type AssetAuditEventDocument = HydratedDocument<AssetAuditEvent>;
export declare class AssetAuditEvent {
    assetId: string;
    fromState?: string;
    toState: string;
    actorUserId?: string;
    reason?: string;
    occurredAt: Date;
}
export declare const AssetAuditEventSchema: import("mongoose").Schema<AssetAuditEvent, import("mongoose").Model<AssetAuditEvent, any, any, any, import("mongoose").Document<unknown, any, AssetAuditEvent, any, {}> & AssetAuditEvent & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AssetAuditEvent, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AssetAuditEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AssetAuditEvent> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const AssetAssignmentModelName = "AssetAssignment";
export type AssetAssignmentDocument = HydratedDocument<AssetAssignment>;
export declare class AssetAssignment {
    assetId: string;
    userId?: string;
    assignedAt: Date;
    returnedAt?: Date;
    notes?: string;
}
export declare const AssetAssignmentSchema: import("mongoose").Schema<AssetAssignment, import("mongoose").Model<AssetAssignment, any, any, any, import("mongoose").Document<unknown, any, AssetAssignment, any, {}> & AssetAssignment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AssetAssignment, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AssetAssignment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AssetAssignment> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
