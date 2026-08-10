"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminNoteSchema = exports.PlatformAdminNote = exports.PlatformAdminNoteModelName = exports.AuditEventSchema = exports.AuditEvent = exports.AuditEventModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.AuditEventModelName = 'AuditEvent';
let AuditEvent = class AuditEvent {
};
exports.AuditEvent = AuditEvent;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AuditEvent.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], AuditEvent.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AuditEvent.prototype, "actorUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AuditEvent.prototype, "action", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AuditEvent.prototype, "targetType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AuditEvent.prototype, "targetId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AuditEvent.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], AuditEvent.prototype, "occurredAt", void 0);
exports.AuditEvent = AuditEvent = __decorate([
    (0, mongoose_1.Schema)({ collection: 'audit_events', timestamps: true, versionKey: false })
], AuditEvent);
exports.AuditEventSchema = mongoose_1.SchemaFactory.createForClass(AuditEvent);
exports.AuditEventSchema.index({ tenantId: 1, occurredAt: -1 });
exports.AuditEventSchema.index({ companyId: 1, occurredAt: -1 });
exports.PlatformAdminNoteModelName = 'PlatformAdminNote';
let PlatformAdminNote = class PlatformAdminNote {
};
exports.PlatformAdminNote = PlatformAdminNote;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PlatformAdminNote.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PlatformAdminNote.prototype, "note", void 0);
exports.PlatformAdminNote = PlatformAdminNote = __decorate([
    (0, mongoose_1.Schema)({ collection: 'platform_admin_notes', timestamps: true, versionKey: false })
], PlatformAdminNote);
exports.PlatformAdminNoteSchema = mongoose_1.SchemaFactory.createForClass(PlatformAdminNote);
//# sourceMappingURL=audit.schemas.js.map