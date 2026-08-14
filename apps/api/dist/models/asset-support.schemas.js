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
exports.AssetDocumentSchema = exports.AssetDocumentMeta = exports.AssetDocumentModelName = exports.AssetCustomFieldValueSchema = exports.AssetCustomFieldValue = exports.AssetCustomFieldValueModelName = exports.CustomFieldDefSchema = exports.CustomFieldDefinition = exports.CustomFieldDefModelName = exports.WarrantySchema = exports.Warranty = exports.WarrantyModelName = exports.VendorSchema = exports.Vendor = exports.VendorModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.VendorModelName = 'Vendor';
let Vendor = class Vendor {
};
exports.Vendor = Vendor;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Vendor.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Vendor.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Vendor.prototype, "contact", void 0);
exports.Vendor = Vendor = __decorate([
    (0, mongoose_1.Schema)({ collection: 'vendors', timestamps: true, versionKey: false })
], Vendor);
exports.VendorSchema = mongoose_1.SchemaFactory.createForClass(Vendor);
exports.WarrantyModelName = 'Warranty';
let Warranty = class Warranty {
};
exports.Warranty = Warranty;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Warranty.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Warranty.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Warranty.prototype, "assetId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Warranty.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Warranty.prototype, "expiresAt", void 0);
exports.Warranty = Warranty = __decorate([
    (0, mongoose_1.Schema)({ collection: 'warranties', timestamps: true, versionKey: false })
], Warranty);
exports.WarrantySchema = mongoose_1.SchemaFactory.createForClass(Warranty);
exports.WarrantySchema.index({ companyId: 1, assetId: 1 }, { unique: true });
exports.CustomFieldDefModelName = 'CustomFieldDefinition';
let CustomFieldDefinition = class CustomFieldDefinition {
};
exports.CustomFieldDefinition = CustomFieldDefinition;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "label", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "fieldType", void 0);
exports.CustomFieldDefinition = CustomFieldDefinition = __decorate([
    (0, mongoose_1.Schema)({ collection: 'custom_field_definitions', timestamps: true, versionKey: false })
], CustomFieldDefinition);
exports.CustomFieldDefSchema = mongoose_1.SchemaFactory.createForClass(CustomFieldDefinition);
exports.CustomFieldDefSchema.index({ companyId: 1, key: 1 }, { unique: true });
exports.AssetCustomFieldValueModelName = 'AssetCustomFieldValue';
let AssetCustomFieldValue = class AssetCustomFieldValue {
};
exports.AssetCustomFieldValue = AssetCustomFieldValue;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetCustomFieldValue.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetCustomFieldValue.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetCustomFieldValue.prototype, "assetId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Object)
], AssetCustomFieldValue.prototype, "values", void 0);
exports.AssetCustomFieldValue = AssetCustomFieldValue = __decorate([
    (0, mongoose_1.Schema)({ collection: 'asset_custom_field_values', timestamps: true, versionKey: false })
], AssetCustomFieldValue);
exports.AssetCustomFieldValueSchema = mongoose_1.SchemaFactory.createForClass(AssetCustomFieldValue);
exports.AssetCustomFieldValueSchema.index({ tenantId: 1, companyId: 1, assetId: 1 }, { unique: true });
exports.AssetDocumentModelName = 'AssetDocument';
let AssetDocumentMeta = class AssetDocumentMeta {
};
exports.AssetDocumentMeta = AssetDocumentMeta;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetDocumentMeta.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetDocumentMeta.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AssetDocumentMeta.prototype, "assetId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetDocumentMeta.prototype, "s3Key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetDocumentMeta.prototype, "fileName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AssetDocumentMeta.prototype, "contentType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AssetDocumentMeta.prototype, "sizeBytes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AssetDocumentMeta.prototype, "documentType", void 0);
exports.AssetDocumentMeta = AssetDocumentMeta = __decorate([
    (0, mongoose_1.Schema)({ collection: 'asset_documents', timestamps: true, versionKey: false })
], AssetDocumentMeta);
exports.AssetDocumentSchema = mongoose_1.SchemaFactory.createForClass(AssetDocumentMeta);
exports.AssetDocumentSchema.index({ tenantId: 1, companyId: 1, assetId: 1 });
exports.AssetDocumentSchema.index({ tenantId: 1, companyId: 1, s3Key: 1 }, { unique: true });
//# sourceMappingURL=asset-support.schemas.js.map