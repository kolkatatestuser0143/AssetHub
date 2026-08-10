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
exports.ScimSyncLogSchema = exports.ScimSyncLog = exports.ScimSyncLogModelName = exports.ScimTokenSchema = exports.ScimToken = exports.ScimTokenModelName = exports.IdentityProviderConfigSchema = exports.IdentityProviderConfig = exports.IdentityProviderConfigModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const enums_1 = require("../common/enums");
exports.IdentityProviderConfigModelName = 'IdentityProviderConfig';
let IdentityProviderConfig = class IdentityProviderConfig {
};
exports.IdentityProviderConfig = IdentityProviderConfig;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], IdentityProviderConfig.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.IdpProtocol, required: true }),
    __metadata("design:type", String)
], IdentityProviderConfig.prototype, "protocol", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], IdentityProviderConfig.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], IdentityProviderConfig.prototype, "config", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], IdentityProviderConfig.prototype, "attributeMapping", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], IdentityProviderConfig.prototype, "isEnabled", void 0);
exports.IdentityProviderConfig = IdentityProviderConfig = __decorate([
    (0, mongoose_1.Schema)({ collection: 'identity_provider_configs', timestamps: true, versionKey: false })
], IdentityProviderConfig);
exports.IdentityProviderConfigSchema = mongoose_1.SchemaFactory.createForClass(IdentityProviderConfig);
exports.IdentityProviderConfigSchema.index({ companyId: 1, name: 1 });
exports.ScimTokenModelName = 'ScimToken';
let ScimToken = class ScimToken {
};
exports.ScimToken = ScimToken;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ScimToken.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], ScimToken.prototype, "tokenHash", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ScimToken.prototype, "label", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.ScimDeprovisionPolicy, default: enums_1.ScimDeprovisionPolicy.DISABLE_LOGIN }),
    __metadata("design:type", String)
], ScimToken.prototype, "deprovisionPolicy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ScimToken.prototype, "revokedAt", void 0);
exports.ScimToken = ScimToken = __decorate([
    (0, mongoose_1.Schema)({ collection: 'scim_tokens', timestamps: true, versionKey: false })
], ScimToken);
exports.ScimTokenSchema = mongoose_1.SchemaFactory.createForClass(ScimToken);
exports.ScimSyncLogModelName = 'ScimSyncLog';
let ScimSyncLog = class ScimSyncLog {
};
exports.ScimSyncLog = ScimSyncLog;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ScimSyncLog.prototype, "scimTokenId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ScimSyncLog.prototype, "operation", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ScimSyncLog.prototype, "externalId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ScimSyncLog.prototype, "payloadHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Boolean)
], ScimSyncLog.prototype, "success", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ScimSyncLog.prototype, "errorMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ScimSyncLog.prototype, "occurredAt", void 0);
exports.ScimSyncLog = ScimSyncLog = __decorate([
    (0, mongoose_1.Schema)({ collection: 'scim_sync_logs', timestamps: true, versionKey: false })
], ScimSyncLog);
exports.ScimSyncLogSchema = mongoose_1.SchemaFactory.createForClass(ScimSyncLog);
exports.ScimSyncLogSchema.index({ scimTokenId: 1, occurredAt: -1 });
//# sourceMappingURL=identity.schemas.js.map