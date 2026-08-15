import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const AssetReportTemplateModelName = 'AssetReportTemplate';
export type AssetReportTemplateDocument = HydratedDocument<AssetReportTemplate>;

@Schema({ collection: 'asset_report_templates', timestamps: true, versionKey: false })
export class AssetReportTemplate {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ trim: true }) description?: string;
  @Prop({ required: true, index: true }) createdBy!: string;
  @Prop({ type: Object, default: {} }) filters!: Record<string, string>;
}

export const AssetReportTemplateSchema = SchemaFactory.createForClass(AssetReportTemplate);
AssetReportTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });
AssetReportTemplateSchema.index({ tenantId: 1, updatedAt: -1 });

export const AssetAcknowledgementTemplateModelName = 'AssetAcknowledgementTemplate';
export type AssetAcknowledgementTemplateDocument = HydratedDocument<AssetAcknowledgementTemplate>;

@Schema({ collection: 'asset_acknowledgement_templates', timestamps: true, versionKey: false })
export class AssetAcknowledgementTemplate {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true }) content!: string;
  @Prop({ required: true, index: true }) createdBy!: string;
  @Prop({ default: false, index: true }) isDefault!: boolean;
}

export const AssetAcknowledgementTemplateSchema = SchemaFactory.createForClass(AssetAcknowledgementTemplate);
AssetAcknowledgementTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });
AssetAcknowledgementTemplateSchema.index({ tenantId: 1, isDefault: 1 });
