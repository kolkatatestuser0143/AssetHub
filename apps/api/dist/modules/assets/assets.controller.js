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
exports.AssetsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const enums_1 = require("../../common/enums");
const assets_service_1 = require("./assets.service");
const tenant_context_guard_1 = require("../../common/guards/tenant-context.guard");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
class CreateAssetDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssetDto.prototype, "assetTypeId", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateAssetDto.prototype, "fields", void 0);
class TransitionDto {
}
__decorate([
    (0, class_validator_1.IsIn)(Object.values(enums_1.AssetLifecycleState)),
    __metadata("design:type", String)
], TransitionDto.prototype, "toState", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransitionDto.prototype, "reason", void 0);
class CreateAssetTypeDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssetTypeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssetTypeDto.prototype, "prefix", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAssetTypeDto.prototype, "separator", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateAssetTypeDto.prototype, "padding", void 0);
let AssetsController = class AssetsController {
    constructor(assets) {
        this.assets = assets;
    }
    list(req) {
        return this.assets.listAssets(req.authContext);
    }
    listTypes(req) {
        return this.assets.listAssetTypes(req.authContext);
    }
    createType(dto, req) {
        return this.assets.createAssetType(req.authContext, dto.name, {
            prefix: dto.prefix,
            separator: dto.separator,
            padding: dto.padding,
        });
    }
    create(dto, req) {
        return this.assets.createAsset(req.authContext, dto.assetTypeId, dto.fields ?? {});
    }
    transition(assetId, dto, req) {
        return this.assets.transitionState(req.authContext, assetId, dto.toState, req.authContext.userId, dto.reason);
    }
};
exports.AssetsController = AssetsController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('asset:read'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('types'),
    (0, require_permission_decorator_1.RequirePermission)('asset:read'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "listTypes", null);
__decorate([
    (0, common_1.Post)('types'),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAssetTypeDto, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "createType", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAssetDto, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':assetId/transition'),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Param)('assetId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, TransitionDto, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "transition", null);
exports.AssetsController = AssetsController = __decorate([
    (0, common_1.Controller)('assets'),
    (0, common_1.UseGuards)(tenant_context_guard_1.TenantContextGuard, rbac_guard_1.RbacGuard),
    __metadata("design:paramtypes", [assets_service_1.AssetsService])
], AssetsController);
//# sourceMappingURL=assets.controller.js.map