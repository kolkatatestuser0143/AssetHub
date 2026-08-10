import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IntegrationKind } from '../common/enums';

export const IntegrationInstanceModelName = 'IntegrationInstance';
export type IntegrationInstanceDocument = HydratedDocument<IntegrationInstance>;

@Schema({ collection: 'integration_instances', timestamps: true, versionKey: false })
export class IntegrationInstance {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ enum: IntegrationKind, required: true }) kind!: string;
  @Prop({ required: true }) provider!: string; // "jumpcloud" | "entra" | "mock" ...
  @Prop({ default: false }) isMock!: boolean;

  // credentials encrypted at rest, referenced by key into secrets store
  @Prop() credentialRef?: string;
  @Prop({ type: Object }) config?: Record<string, unknown>;

  @Prop() lastSyncAt?: Date;
  @Prop() lastSyncStatus?: string;
}

export const IntegrationInstanceSchema = SchemaFactory.createForClass(IntegrationInstance);
IntegrationInstanceSchema.index({ companyId: 1, provider: 1 });
