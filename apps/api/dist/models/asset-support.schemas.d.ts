import { HydratedDocument } from 'mongoose';
export declare const VendorModelName = "Vendor";
export type VendorDocument = HydratedDocument<Vendor>;
export declare class Vendor {
    companyId: string;
    name: string;
    contact?: string;
}
export declare const VendorSchema: import("mongoose").Schema<Vendor, import("mongoose").Model<Vendor, any, any, any, import("mongoose").Document<unknown, any, Vendor, any, {}> & Vendor & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Vendor, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Vendor>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Vendor> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const WarrantyModelName = "Warranty";
export type WarrantyDocument = HydratedDocument<Warranty>;
export declare class Warranty {
    tenantId: string;
    companyId: string;
    assetId: string;
    provider?: string;
    expiresAt?: Date;
}
export declare const WarrantySchema: import("mongoose").Schema<Warranty, import("mongoose").Model<Warranty, any, any, any, import("mongoose").Document<unknown, any, Warranty, any, {}> & Warranty & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Warranty, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Warranty>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Warranty> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const CustomFieldDefModelName = "CustomFieldDefinition";
export type CustomFieldDefDocument = HydratedDocument<CustomFieldDefinition>;
export declare class CustomFieldDefinition {
    tenantId: string;
    companyId: string;
    key: string;
    label: string;
    fieldType: string;
}
export declare const CustomFieldDefSchema: import("mongoose").Schema<CustomFieldDefinition, import("mongoose").Model<CustomFieldDefinition, any, any, any, import("mongoose").Document<unknown, any, CustomFieldDefinition, any, {}> & CustomFieldDefinition & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CustomFieldDefinition, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CustomFieldDefinition>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CustomFieldDefinition> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const AssetCustomFieldValueModelName = "AssetCustomFieldValue";
export type AssetCustomFieldValueDocument = HydratedDocument<AssetCustomFieldValue>;
export declare class AssetCustomFieldValue {
    tenantId: string;
    companyId: string;
    assetId: string;
    values: Record<string, string>;
}
export declare const AssetCustomFieldValueSchema: import("mongoose").Schema<AssetCustomFieldValue, import("mongoose").Model<AssetCustomFieldValue, any, any, any, import("mongoose").Document<unknown, any, AssetCustomFieldValue, any, {}> & AssetCustomFieldValue & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AssetCustomFieldValue, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AssetCustomFieldValue>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AssetCustomFieldValue> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const AssetDocumentModelName = "AssetDocument";
export type AssetDocumentDoc = HydratedDocument<AssetDocumentMeta>;
export declare class AssetDocumentMeta {
    tenantId: string;
    companyId: string;
    assetId: string;
    s3Key: string;
    fileName: string;
    contentType?: string;
    sizeBytes?: number;
    documentType?: string;
}
export declare const AssetDocumentSchema: import("mongoose").Schema<AssetDocumentMeta, import("mongoose").Model<AssetDocumentMeta, any, any, any, import("mongoose").Document<unknown, any, AssetDocumentMeta, any, {}> & AssetDocumentMeta & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AssetDocumentMeta, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AssetDocumentMeta>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AssetDocumentMeta> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
