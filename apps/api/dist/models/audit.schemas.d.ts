import { HydratedDocument } from 'mongoose';
export declare const AuditEventModelName = "AuditEvent";
export type AuditEventDocument = HydratedDocument<AuditEvent>;
export declare class AuditEvent {
    tenantId: string;
    companyId?: string;
    actorUserId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
    occurredAt: Date;
}
export declare const AuditEventSchema: import("mongoose").Schema<AuditEvent, import("mongoose").Model<AuditEvent, any, any, any, import("mongoose").Document<unknown, any, AuditEvent, any, {}> & AuditEvent & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AuditEvent, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AuditEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AuditEvent> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const PlatformAdminNoteModelName = "PlatformAdminNote";
export type PlatformAdminNoteDocument = HydratedDocument<PlatformAdminNote>;
export declare class PlatformAdminNote {
    tenantId: string;
    note: string;
}
export declare const PlatformAdminNoteSchema: import("mongoose").Schema<PlatformAdminNote, import("mongoose").Model<PlatformAdminNote, any, any, any, import("mongoose").Document<unknown, any, PlatformAdminNote, any, {}> & PlatformAdminNote & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PlatformAdminNote, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PlatformAdminNote>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PlatformAdminNote> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
