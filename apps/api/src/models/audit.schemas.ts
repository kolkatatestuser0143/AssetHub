import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const AuditEventModelName = 'AuditEvent';
export type AuditEventDocument = HydratedDocument<AuditEvent>;

@Schema({ collection: 'audit_events', timestamps: true, versionKey: false })
export class AuditEvent {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ index: true }) companyId?: string;
  @Prop({ index: true }) actorUserId?: string;
  @Prop({ required: true, index: true }) action!: string;
  @Prop() targetType?: string;
  @Prop() targetId?: string;
  @Prop({ type: Object }) metadata?: Record<string, unknown>;
  @Prop() result?: string;
  @Prop() route?: string;
  @Prop() method?: string;
  @Prop() statusCode?: number;
  @Prop({ index: true }) requestId?: string;
  @Prop() ipAddress?: string;
  @Prop() userAgent?: string;
  @Prop({ default: Date.now, index: true }) occurredAt!: Date;
}

export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);
AuditEventSchema.index({ tenantId: 1, occurredAt: -1 });
AuditEventSchema.index({ companyId: 1, occurredAt: -1 });
AuditEventSchema.index({ actorUserId: 1, occurredAt: -1 });
AuditEventSchema.index({ action: 1, occurredAt: -1 });
AuditEventSchema.index({ requestId: 1, occurredAt: -1 });

export const PlatformAdminNoteModelName = 'PlatformAdminNote';
export type PlatformAdminNoteDocument = HydratedDocument<PlatformAdminNote>;

@Schema({ collection: 'platform_admin_notes', timestamps: true, versionKey: false })
export class PlatformAdminNote {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true }) note!: string;
}

export const PlatformAdminNoteSchema = SchemaFactory.createForClass(PlatformAdminNote);
