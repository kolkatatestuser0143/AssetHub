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
exports.TenancyController = void 0;
const common_1 = require("@nestjs/common");
const tenancy_service_1 = require("./tenancy.service");
const tenant_context_guard_1 = require("../../common/guards/tenant-context.guard");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const class_validator_1 = require("class-validator");
class CreateCompanyDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "code", void 0);
class CreateNamedChildDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateNamedChildDto.prototype, "name", void 0);
let TenancyController = class TenancyController {
    constructor(tenancy) {
        this.tenancy = tenancy;
    }
    list(req) {
        return this.tenancy.listCompanies(req.authContext);
    }
    create(dto, req) {
        return this.tenancy.createCompany(req.authContext, dto.name, dto.code);
    }
    createBusinessUnit(companyId, dto, req) {
        return this.tenancy.createBusinessUnit(req.authContext, companyId, dto.name);
    }
    createPlant(businessUnitId, dto, req) {
        return this.tenancy.createPlant(req.authContext, businessUnitId, dto.name);
    }
    createLocation(plantId, dto, req) {
        return this.tenancy.createLocation(req.authContext, plantId, dto.name);
    }
    createDepartment(locationId, dto, req) {
        return this.tenancy.createDepartment(req.authContext, locationId, dto.name);
    }
};
exports.TenancyController = TenancyController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('company:read'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenancyController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('company:write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCompanyDto, Object]),
    __metadata("design:returntype", void 0)
], TenancyController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':companyId/business-units'),
    (0, require_permission_decorator_1.RequirePermission)('company:write'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateNamedChildDto, Object]),
    __metadata("design:returntype", void 0)
], TenancyController.prototype, "createBusinessUnit", null);
__decorate([
    (0, common_1.Post)('business-units/:businessUnitId/plants'),
    (0, require_permission_decorator_1.RequirePermission)('company:write'),
    __param(0, (0, common_1.Param)('businessUnitId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateNamedChildDto, Object]),
    __metadata("design:returntype", void 0)
], TenancyController.prototype, "createPlant", null);
__decorate([
    (0, common_1.Post)('plants/:plantId/locations'),
    (0, require_permission_decorator_1.RequirePermission)('company:write'),
    __param(0, (0, common_1.Param)('plantId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateNamedChildDto, Object]),
    __metadata("design:returntype", void 0)
], TenancyController.prototype, "createLocation", null);
__decorate([
    (0, common_1.Post)('locations/:locationId/departments'),
    (0, require_permission_decorator_1.RequirePermission)('company:write'),
    __param(0, (0, common_1.Param)('locationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateNamedChildDto, Object]),
    __metadata("design:returntype", void 0)
], TenancyController.prototype, "createDepartment", null);
exports.TenancyController = TenancyController = __decorate([
    (0, common_1.Controller)('companies'),
    (0, common_1.UseGuards)(tenant_context_guard_1.TenantContextGuard, rbac_guard_1.RbacGuard),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService])
], TenancyController);
//# sourceMappingURL=tenancy.controller.js.map