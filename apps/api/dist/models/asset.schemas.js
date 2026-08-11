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
exports.AssetAssignmentSchema = exports.AssetAssignment = exports.AssetAssignmentModelName = exports.AssetAuditEventSchema = exports.AssetAuditEvent = exports.AssetAuditEventModelName = exports.AssetSchema = exports.Asset = exports.AssetModelName = exports.AssetTypeSchema = exports.AssetType = exports.AssetNumberingRuleSchema = exports.AssetNumberingRule = exports.AssetTypeModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const enums_1 = require("../common/enums");
exports.AssetTypeModelName = 'AssetType';
let AssetNumberingRule = class AssetNumberingRule {
};
exports.AssetNumberingRule = AssetNumberingRule;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetNumberingRule.prototype, "prefix", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '-' }),
    __metadata("design:type", String)
], AssetNumberingRule.prototype, "separator", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 6 }),
    __metadata("design:type", Number)
], AssetNumberingRule.prototype, "padding", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], AssetNumberingRule.prototype, "nextSequence", void 0);
exports.AssetNumberingRule = AssetNumberingRule = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], AssetNumberingRule);
exports.AssetNumberingRuleSchema = mongoose_1.SchemaFactory.createForClass(AssetNumberingRule);
let AssetType = class AssetType {
};
exports.AssetType = AssetType;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetType.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetType.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.AssetNumberingRuleSchema }),
    __metadata("design:type", AssetNumberingRule)
], AssetType.prototype, "numberingRule", void 0);
exports.AssetType = AssetType = __decorate([
    (0, mongoose_1.Schema)({ collection: 'asset_types', timestamps: true, versionKey: false })
], AssetType);
exports.AssetTypeSchema = mongoose_1.SchemaFactory.createForClass(AssetType);
exports.AssetTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });
exports.AssetModelName = 'Asset';
let Asset = class Asset {
};
exports.Asset = Asset;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Asset.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Asset.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Asset.prototype, "assetTypeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Asset.prototype, "assetNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Asset.prototype, "serialNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Asset.prototype, "model", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.AssetLifecycleState, default: enums_1.AssetLifecycleState.IN_STOCK }),
    __metadata("design:type", String)
], Asset.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Asset.prototype, "locationId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Asset.prototype, "departmentId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Asset.prototype, "vendorId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Asset.prototype, "purchaseDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { provider: String, expiresAt: Date }, _id: false }),
    __metadata("design:type", Object)
], Asset.prototype, "warranty", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Asset.prototype, "qrCodeUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Asset.prototype, "barcodeValue", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Asset.prototype, "customFields", void 0);
exports.Asset = Asset = __decorate([
    (0, mongoose_1.Schema)({ collection: 'assets', timestamps: true, versionKey: false })
], Asset);
exports.AssetSchema = mongoose_1.SchemaFactory.createForClass(Asset);
exports.AssetSchema.index({ companyId: 1, assetNumber: 1 }, { unique: true });
exports.AssetSchema.index({ companyId: 1, status: 1 });
exports.AssetAuditEventModelName = 'AssetAuditEvent';
let AssetAuditEvent = class AssetAuditEvent {
};
exports.AssetAuditEvent = AssetAuditEvent;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetAuditEvent.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetAuditEvent.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetAuditEvent.prototype, "assetId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.AssetLifecycleState }),
    __metadata("design:type", String)
], AssetAuditEvent.prototype, "fromState", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: enums_1.AssetLifecycleState }),
    __metadata("design:type", String)
], AssetAuditEvent.prototype, "toState", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AssetAuditEvent.prototype, "actorUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AssetAuditEvent.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], AssetAuditEvent.prototype, "occurredAt", void 0);
exports.AssetAuditEvent = AssetAuditEvent = __decorate([
    (0, mongoose_1.Schema)({ collection: 'asset_audit_events', timestamps: true, versionKey: false })
], AssetAuditEvent);
exports.AssetAuditEventSchema = mongoose_1.SchemaFactory.createForClass(AssetAuditEvent);
exports.AssetAuditEventSchema.index({ assetId: 1, occurredAt: -1 });
exports.AssetAuditEventSchema.index({ tenantId: 1, companyId: 1, occurredAt: -1 });
exports.AssetAssignmentModelName = 'AssetAssignment';
let AssetAssignment = class AssetAssignment {
};
exports.AssetAssignment = AssetAssignment;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetAssignment.prototype, "assetId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], AssetAssignment.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], AssetAssignment.prototype, "assignedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], AssetAssignment.prototype, "returnedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AssetAssignment.prototype, "notes", void 0);
exports.AssetAssignment = AssetAssignment = __decorate([
    (0, mongoose_1.Schema)({ collection: 'asset_assignments', timestamps: true, versionKey: false })
], AssetAssignment);
exports.AssetAssignmentSchema = mongoose_1.SchemaFactory.createForClass(AssetAssignment);
exports.AssetAssignmentSchema.index({ assetId: 1 }, { unique: true, partialFilterExpression: { returnedAt: { $exists: false } } });
exports.AssetAssignmentSchema.index({ assetId: 1, assignedAt: -1 });
//# sourceMappingURL=asset.schemas.js.map