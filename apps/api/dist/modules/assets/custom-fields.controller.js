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
exports.CustomFieldsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const tenant_context_guard_1 = require("../../common/guards/tenant-context.guard");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const custom_fields_service_1 = require("./custom-fields.service");
class CustomFieldDefinitionDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z][a-z0-9_.-]{0,63}$/),
    __metadata("design:type", String)
], CustomFieldDefinitionDto.prototype, "key", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomFieldDefinitionDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['text', 'number', 'boolean', 'date']),
    __metadata("design:type", String)
], CustomFieldDefinitionDto.prototype, "fieldType", void 0);
class UpdateCustomFieldDefinitionDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCustomFieldDefinitionDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['text', 'number', 'boolean', 'date']),
    __metadata("design:type", String)
], UpdateCustomFieldDefinitionDto.prototype, "fieldType", void 0);
class CustomFieldValuesDto {
}
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CustomFieldValuesDto.prototype, "values", void 0);
let CustomFieldsController = class CustomFieldsController {
    constructor(fields) {
        this.fields = fields;
    }
    listDefinitions(req) {
        return this.fields.listDefinitions(req.authContext);
    }
    createDefinition(dto, req) {
        return this.fields.createDefinition(req.authContext, dto.key, dto.label, dto.fieldType);
    }
    updateDefinition(key, dto, req) {
        return this.fields.updateDefinition(req.authContext, key, dto.label, dto.fieldType);
    }
    deleteDefinition(key, req) {
        return this.fields.deleteDefinition(req.authContext, key);
    }
    getValues(assetId, req) {
        return this.fields.getValues(req.authContext, assetId);
    }
    setValues(assetId, dto, req) {
        return this.fields.setValues(req.authContext, assetId, dto.values);
    }
    clearValue(assetId, key, req) {
        return this.fields.clearValue(req.authContext, assetId, key);
    }
};
exports.CustomFieldsController = CustomFieldsController;
__decorate([
    (0, common_1.Get)('custom-fields'),
    (0, require_permission_decorator_1.RequirePermission)('asset:read'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomFieldsController.prototype, "listDefinitions", null);
__decorate([
    (0, common_1.Post)('custom-fields'),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CustomFieldDefinitionDto, Object]),
    __metadata("design:returntype", void 0)
], CustomFieldsController.prototype, "createDefinition", null);
__decorate([
    (0, common_1.Put)('custom-fields/:key'),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateCustomFieldDefinitionDto, Object]),
    __metadata("design:returntype", void 0)
], CustomFieldsController.prototype, "updateDefinition", null);
__decorate([
    (0, common_1.Delete)('custom-fields/:key'),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CustomFieldsController.prototype, "deleteDefinition", null);
__decorate([
    (0, common_1.Get)('assets/:assetId/custom-fields'),
    (0, require_permission_decorator_1.RequirePermission)('asset:read'),
    __param(0, (0, common_1.Param)('assetId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CustomFieldsController.prototype, "getValues", null);
__decorate([
    (0, common_1.Post)('assets/:assetId/custom-fields'),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Param)('assetId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CustomFieldValuesDto, Object]),
    __metadata("design:returntype", void 0)
], CustomFieldsController.prototype, "setValues", null);
__decorate([
    (0, common_1.Delete)('assets/:assetId/custom-fields/:key'),
    (0, require_permission_decorator_1.RequirePermission)('asset:write'),
    __param(0, (0, common_1.Param)('assetId')),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CustomFieldsController.prototype, "clearValue", null);
exports.CustomFieldsController = CustomFieldsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(tenant_context_guard_1.TenantContextGuard, rbac_guard_1.RbacGuard),
    __metadata("design:paramtypes", [custom_fields_service_1.CustomFieldsService])
], CustomFieldsController);
//# sourceMappingURL=custom-fields.controller.js.map