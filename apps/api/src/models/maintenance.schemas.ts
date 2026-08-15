import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const AssetMaintenanceModelName = 'AssetMaintenance';
export type AssetMaintenanceDocument = HydratedDocument<AssetMaintenance>;

@Schema({ collection: 'asset_maintenance', timestamps: true, versionKey: false })
export class AssetMaintenance {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) assetId!: string;
  @Prop({ required: true }) serviceDate!: Date;
  @Prop({ required: true, enum: ['REPAIR', 'PREVENTIVE', 'INSPECTION', 'OTHER'] }) serviceType!: string;
  @Prop() provider?: string;
  @Prop() technician?: string;
  @Prop() notes?: string;
  @Prop() nextServiceDate?: Date;
  @Prop({ type: String }) attachmentDocumentId?: string;
  @Prop({ required: true }) createdByUserId!: string;
}

export const AssetMaintenanceSchema = SchemaFactory.createForClass(AssetMaintenance);
AssetMaintenanceSchema.index({ tenantId: 1, companyId: 1, assetId: 1, serviceDate: -1 });
