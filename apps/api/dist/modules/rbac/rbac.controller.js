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
exports.RbacController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const rbac_service_1 = require("./rbac.service");
const tenant_context_guard_1 = require("../../common/guards/tenant-context.guard");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
class CreateRoleDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(0),
    __metadata("design:type", Array)
], CreateRoleDto.prototype, "permissionKeys", void 0);
let RbacController = class RbacController {
    constructor(rbac) {
        this.rbac = rbac;
    }
    listPermissions() {
        return this.rbac.listPermissions();
    }
    listRoles(req) {
        return this.rbac.listRoles(req.authContext);
    }
    createRole(dto, req) {
        return this.rbac.createRole(req.authContext, dto.name, dto.permissionKeys);
    }
    assignRole(roleId, userId) {
        return this.rbac.assignRole(userId, roleId);
    }
};
exports.RbacController = RbacController;
__decorate([
    (0, common_1.Get)('permissions'),
    (0, require_permission_decorator_1.RequirePermission)('role:read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RbacController.prototype, "listPermissions", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('role:read'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbacController.prototype, "listRoles", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('role:write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateRoleDto, Object]),
    __metadata("design:returntype", void 0)
], RbacController.prototype, "createRole", null);
__decorate([
    (0, common_1.Post)(':roleId/assign/:userId'),
    (0, require_permission_decorator_1.RequirePermission)('role:write'),
    __param(0, (0, common_1.Param)('roleId')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RbacController.prototype, "assignRole", null);
exports.RbacController = RbacController = __decorate([
    (0, common_1.Controller)('roles'),
    (0, common_1.UseGuards)(tenant_context_guard_1.TenantContextGuard, rbac_guard_1.RbacGuard),
    __metadata("design:paramtypes", [rbac_service_1.RbacService])
], RbacController);
//# sourceMappingURL=rbac.controller.js.map