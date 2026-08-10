import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IdpProtocol, ScimDeprovisionPolicy } from '../common/enums';

export const IdentityProviderConfigModelName = 'IdentityProviderConfig';
export type IdentityProviderConfigDocument = HydratedDocument<IdentityProviderConfig>;

@Schema({ collection: 'identity_provider_configs', timestamps: true, versionKey: false })
export class IdentityProviderConfig {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ enum: IdpProtocol, required: true }) protocol!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ type: Object, required: true }) config!: Record<string, unknown>;
  @Prop({ type: Object, required: true }) attributeMapping!: Record<string, string>;
  @Prop({ default: true }) isEnabled!: boolean;
}

export const IdentityProviderConfigSchema = SchemaFactory.createForClass(IdentityProviderConfig);
IdentityProviderConfigSchema.index({ companyId: 1, name: 1 });

export const ScimTokenModelName = 'ScimToken';
export type ScimTokenDocument = HydratedDocument<ScimToken>;

@Schema({ collection: 'scim_tokens', timestamps: true, versionKey: false })
export class ScimToken {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, unique: true }) tokenHash!: string;
  @Prop() label?: string;
  @Prop({ enum: ScimDeprovisionPolicy, default: ScimDeprovisionPolicy.DISABLE_LOGIN })
  deprovisionPolicy!: string;
  @Prop() revokedAt?: Date;
}

export const ScimTokenSchema = SchemaFactory.createForClass(ScimToken);

export const ScimSyncLogModelName = 'ScimSyncLog';
export type ScimSyncLogDocument = HydratedDocument<ScimSyncLog>;

@Schema({ collection: 'scim_sync_logs', timestamps: true, versionKey: false })
export class ScimSyncLog {
  @Prop({ required: true, index: true }) scimTokenId!: string;
  @Prop({ required: true }) operation!: string;
  @Prop() externalId?: string;
  @Prop({ required: true }) payloadHash!: string;
  @Prop({ required: true }) success!: boolean;
  @Prop() errorMessage?: string;
  @Prop({ default: Date.now }) occurredAt!: Date;
}

export const ScimSyncLogSchema = SchemaFactory.createForClass(ScimSyncLog);
ScimSyncLogSchema.index({ scimTokenId: 1, occurredAt: -1 });
