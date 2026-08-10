import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const VendorModelName = 'Vendor';
export type VendorDocument = HydratedDocument<Vendor>;

@Schema({ collection: 'vendors', timestamps: true, versionKey: false })
export class Vendor {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) name!: string;
  @Prop() contact?: string;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

export const WarrantyModelName = 'Warranty';
export type WarrantyDocument = HydratedDocument<Warranty>;

@Schema({ collection: 'warranties', timestamps: true, versionKey: false })
export class Warranty {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) assetId!: string;
  @Prop() provider?: string;
  @Prop() expiresAt?: Date;
}

export const WarrantySchema = SchemaFactory.createForClass(Warranty);
WarrantySchema.index({ companyId: 1, assetId: 1 }, { unique: true });

export const CustomFieldDefModelName = 'CustomFieldDefinition';
export type CustomFieldDefDocument = HydratedDocument<CustomFieldDefinition>;

@Schema({ collection: 'custom_field_definitions', timestamps: true, versionKey: false })
export class CustomFieldDefinition {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) key!: string;
  @Prop({ required: true }) label!: string;
  @Prop({ required: true }) fieldType!: string;
}

export const CustomFieldDefSchema = SchemaFactory.createForClass(CustomFieldDefinition);
CustomFieldDefSchema.index({ companyId: 1, key: 1 }, { unique: true });

export const AssetCustomFieldValueModelName = 'AssetCustomFieldValue';
export type AssetCustomFieldValueDocument = HydratedDocument<AssetCustomFieldValue>;

@Schema({ collection: 'asset_custom_field_values', timestamps: true, versionKey: false })
export class AssetCustomFieldValue {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, unique: true }) assetId!: string;
  @Prop({ type: Map, of: String }) values!: Record<string, string>;
}

export const AssetCustomFieldValueSchema = SchemaFactory.createForClass(AssetCustomFieldValue);
AssetCustomFieldValueSchema.index({ tenantId: 1, companyId: 1, assetId: 1 }, { unique: true });

export const AssetDocumentModelName = 'AssetDocument';
export type AssetDocumentDoc = HydratedDocument<AssetDocumentMeta>;

@Schema({ collection: 'asset_documents', timestamps: true, versionKey: false })
export class AssetDocumentMeta {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) assetId!: string;
  @Prop({ required: true }) s3Key!: string;
  @Prop({ required: true }) fileName!: string;
  @Prop() contentType?: string;
  @Prop() sizeBytes?: number;
}

export const AssetDocumentSchema = SchemaFactory.createForClass(AssetDocumentMeta);
AssetDocumentSchema.index({ tenantId: 1, companyId: 1, assetId: 1 });
AssetDocumentSchema.index({ tenantId: 1, companyId: 1, s3Key: 1 }, { unique: true });
