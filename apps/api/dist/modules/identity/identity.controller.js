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
exports.IdentityController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const identity_service_1 = require("./identity.service");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const tenant_context_guard_1 = require("../../common/guards/tenant-context.guard");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
class CreateIdpConfigDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIdpConfigDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['SAML', 'OIDC']),
    __metadata("design:type", String)
], CreateIdpConfigDto.prototype, "protocol", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateIdpConfigDto.prototype, "config", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateIdpConfigDto.prototype, "attributeMapping", void 0);
let IdentityController = class IdentityController {
    constructor(identity, db) {
        this.identity = identity;
        this.db = db;
    }
    async createConfig(companyId, dto, req) {
        if (!req.authContext.crossCompany && req.authContext.companyId !== companyId) {
            throw new common_1.ForbiddenException('Company out of scope');
        }
        const doc = await this.db.identityProviderConfig.create({
            companyId,
            protocol: dto.protocol,
            name: dto.name,
            config: dto.config,
            attributeMapping: dto.attributeMapping,
            isEnabled: true,
        });
        return { id: String(doc._id), ...doc.toObject() };
    }
    async startLogin(companyId, idpConfigId) {
        const url = await this.identity.getStartUrl(companyId, idpConfigId);
        return { url };
    }
    async samlCallback(companyId, idpConfigId, body, req) {
        return this.identity.handleCallback(companyId, idpConfigId, body, req.ip, req.headers['user-agent'] ?? '');
    }
    async oidcCallback(companyId, idpConfigId, query, req) {
        return this.identity.handleCallback(companyId, idpConfigId, query, req.ip, req.headers['user-agent'] ?? '');
    }
};
exports.IdentityController = IdentityController;
__decorate([
    (0, common_1.Post)(':companyId'),
    (0, common_1.UseGuards)(tenant_context_guard_1.TenantContextGuard, rbac_guard_1.RbacGuard),
    (0, require_permission_decorator_1.RequirePermission)('identity_provider:write'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateIdpConfigDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "createConfig", null);
__decorate([
    (0, common_1.Get)(':companyId/:idpConfigId/login'),
    (0, common_1.Redirect)(),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('idpConfigId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "startLogin", null);
__decorate([
    (0, common_1.Post)(':companyId/:idpConfigId/callback/saml'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('idpConfigId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "samlCallback", null);
__decorate([
    (0, common_1.Get)(':companyId/:idpConfigId/callback/oidc'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('idpConfigId')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "oidcCallback", null);
exports.IdentityController = IdentityController = __decorate([
    (0, common_1.Controller)('identity-providers'),
    __metadata("design:paramtypes", [identity_service_1.IdentityService,
        mongoose_database_service_1.MongooseDatabaseService])
], IdentityController);
//# sourceMappingURL=identity.controller.js.map