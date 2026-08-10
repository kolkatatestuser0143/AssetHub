import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AssetLifecycleState } from '../common/enums';

export const AssetTypeModelName = 'AssetType';
export type AssetTypeDocument = HydratedDocument<AssetType>;

@Schema({ _id: false, versionKey: false })
export class AssetNumberingRule {
  @Prop({ required: true }) prefix!: string;
  @Prop({ default: '-' }) separator!: string;
  @Prop({ default: 6 }) padding!: number;
  @Prop({ default: 1 }) nextSequence!: number;
}

export const AssetNumberingRuleSchema = SchemaFactory.createForClass(AssetNumberingRule);

@Schema({ collection: 'asset_types', timestamps: true, versionKey: false })
export class AssetType {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ type: AssetNumberingRuleSchema }) numberingRule?: AssetNumberingRule;
}

export const AssetTypeSchema = SchemaFactory.createForClass(AssetType);
AssetTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const AssetModelName = 'Asset';
export type AssetDocument = HydratedDocument<Asset>;

@Schema({ collection: 'assets', timestamps: true, versionKey: false })
export class Asset {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) assetTypeId!: string;
  @Prop({ required: true }) assetNumber!: string;
  @Prop() serialNumber?: string;
  @Prop() model?: string;
  @Prop({ enum: AssetLifecycleState, default: AssetLifecycleState.IN_STOCK }) status!: string;
  @Prop() locationId?: string;
  @Prop() departmentId?: string;
  @Prop() vendorId?: string;
  @Prop() purchaseDate?: Date;
  @Prop({ type: { provider: String, expiresAt: Date }, _id: false })
  warranty?: { provider?: string; expiresAt?: Date };
  @Prop() qrCodeUrl?: string;
  @Prop() barcodeValue?: string;
  @Prop({ type: Object, default: {} }) customFields?: Record<string, string>;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
AssetSchema.index({ companyId: 1, assetNumber: 1 }, { unique: true });
AssetSchema.index({ companyId: 1, status: 1 });

export const AssetAuditEventModelName = 'AssetAuditEvent';
export type AssetAuditEventDocument = HydratedDocument<AssetAuditEvent>;

@Schema({ collection: 'asset_audit_events', timestamps: true, versionKey: false })
export class AssetAuditEvent {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) assetId!: string;
  @Prop({ enum: AssetLifecycleState }) fromState?: string;
  @Prop({ required: true, enum: AssetLifecycleState }) toState!: string;
  @Prop() actorUserId?: string;
  @Prop() reason?: string;
  @Prop({ default: Date.now }) occurredAt!: Date;
}

export const AssetAuditEventSchema = SchemaFactory.createForClass(AssetAuditEvent);
AssetAuditEventSchema.index({ assetId: 1, occurredAt: -1 });
AssetAuditEventSchema.index({ tenantId: 1, companyId: 1, occurredAt: -1 });

export const AssetAssignmentModelName = 'AssetAssignment';
export type AssetAssignmentDocument = HydratedDocument<AssetAssignment>;

@Schema({ collection: 'asset_assignments', timestamps: true, versionKey: false })
export class AssetAssignment {
  @Prop({ required: true, index: true }) assetId!: string;
  @Prop({ index: true }) userId?: string;
  @Prop({ default: Date.now }) assignedAt!: Date;
  @Prop() returnedAt?: Date;
  @Prop() notes?: string;
}

export const AssetAssignmentSchema = SchemaFactory.createForClass(AssetAssignment);
AssetAssignmentSchema.index(
  { assetId: 1 },
  { unique: true, partialFilterExpression: { returnedAt: { $exists: false } } },
);
AssetAssignmentSchema.index({ assetId: 1, assignedAt: -1 });
