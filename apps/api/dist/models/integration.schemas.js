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
exports.IntegrationInstanceSchema = exports.IntegrationInstance = exports.IntegrationInstanceModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const enums_1 = require("../common/enums");
exports.IntegrationInstanceModelName = 'IntegrationInstance';
let IntegrationInstance = class IntegrationInstance {
};
exports.IntegrationInstance = IntegrationInstance;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], IntegrationInstance.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.IntegrationKind, required: true }),
    __metadata("design:type", String)
], IntegrationInstance.prototype, "kind", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], IntegrationInstance.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], IntegrationInstance.prototype, "isMock", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IntegrationInstance.prototype, "credentialRef", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], IntegrationInstance.prototype, "config", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], IntegrationInstance.prototype, "lastSyncAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IntegrationInstance.prototype, "lastSyncStatus", void 0);
exports.IntegrationInstance = IntegrationInstance = __decorate([
    (0, mongoose_1.Schema)({ collection: 'integration_instances', timestamps: true, versionKey: false })
], IntegrationInstance);
exports.IntegrationInstanceSchema = mongoose_1.SchemaFactory.createForClass(IntegrationInstance);
exports.IntegrationInstanceSchema.index({ companyId: 1, provider: 1 });
//# sourceMappingURL=integration.schemas.js.map