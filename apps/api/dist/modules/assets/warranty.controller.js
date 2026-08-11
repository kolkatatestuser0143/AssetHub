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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarrantyController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const tenant_context_guard_1 = require("../../common/guards/tenant-context.guard");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const warranty_service_1 = require("./warranty.service");
class WarrantyDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WarrantyDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WarrantyDto.prototype, "expiresAt", void 0);
let WarrantyController = class WarrantyController {
    constructor(warranty) {
        this.warranty = warranty;
    }
    get(assetId, req) {
        return this.warranty.get(req.authContext, assetId);
    }
    upsert(assetId, dto, req) {
        return this.warranty.upsert(req.authContext, assetId, dto.provider, dto.expiresAt ? new Date(dto.expiresAt) : undefined);
    }
    remove(assetId, req) {
        return this.warranty.remove(req.authContext, assetId);
    }
};
exports.WarrantyController = WarrantyController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('asset:read'),
    __param(0, (0, common_1.Param)('assetId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Param)('assetId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, WarrantyDto, Object]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "upsert", null);
__decorate([
    (0, common_1.Delete)(),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Param)('assetId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "remove", null);
exports.WarrantyController = WarrantyController = __decorate([
    (0, common_1.Controller)('assets/:assetId/warranty'),
    (0, common_1.UseGuards)(tenant_context_guard_1.TenantContextGuard, rbac_guard_1.RbacGuard),
    __metadata("design:paramtypes", [warranty_service_1.WarrantyService])
], WarrantyController);
//# sourceMappingURL=warranty.controller.js.map