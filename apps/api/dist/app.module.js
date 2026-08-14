"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const throttler_1 = require("@nestjs/throttler");
const database_module_1 = require("./common/database/database.module");
const mongoose_database_service_1 = require("./common/mongoose-database.service");
const audit_interceptor_1 = require("./common/audit/audit.interceptor");
const auth_controller_1 = require("./modules/auth/auth.controller");
const auth_service_1 = require("./modules/auth/auth.service");
const provisioning_service_1 = require("./modules/auth/provisioning.service");
const session_service_1 = require("./modules/auth/session.service");
const assets_controller_1 = require("./modules/assets/assets.controller");
const assets_service_1 = require("./modules/assets/assets.service");
const asset_documents_controller_1 = require("./modules/assets/asset-documents.controller");
const asset_documents_service_1 = require("./modules/assets/asset-documents.service");
const custom_fields_controller_1 = require("./modules/assets/custom-fields.controller");
const custom_fields_service_1 = require("./modules/assets/custom-fields.service");
const warranty_controller_1 = require("./modules/assets/warranty.controller");
const warranty_service_1 = require("./modules/assets/warranty.service");
const tenancy_controller_1 = require("./modules/tenancy/tenancy.controller");
const tenancy_service_1 = require("./modules/tenancy/tenancy.service");
const rbac_controller_1 = require("./modules/rbac/rbac.controller");
const rbac_service_1 = require("./modules/rbac/rbac.service");
const identity_security_cache_service_1 = require("./modules/identity/identity-security-cache.service");
const identity_controller_1 = require("./modules/identity/identity.controller");
const identity_service_1 = require("./modules/identity/identity.service");
const identity_admin_controller_1 = require("./modules/identity/identity-admin.controller");
const tenant_license_controller_1 = require("./modules/billing/tenant-license.controller");
const tenant_license_service_1 = require("./modules/billing/tenant-license.service");
const system_subscription_controller_1 = require("./modules/billing/system-subscription.controller");
const system_subscription_service_1 = require("./modules/billing/system-subscription.service");
const system_admin_controller_1 = require("./modules/system/system-admin.controller");
const system_admin_service_1 = require("./modules/system/system-admin.service");
const audit_controller_1 = require("./modules/audit/audit.controller");
const audit_service_1 = require("./modules/audit/audit.service");
const users_controller_1 = require("./modules/users/users.controller");
const users_service_1 = require("./modules/users/users.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            jwt_1.JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET, signOptions: { algorithm: 'HS256' } }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        ],
        controllers: [
            auth_controller_1.AuthController, assets_controller_1.AssetsController, asset_documents_controller_1.AssetDocumentsController, warranty_controller_1.WarrantyController, custom_fields_controller_1.CustomFieldsController,
            tenancy_controller_1.TenancyController, rbac_controller_1.RbacController, identity_controller_1.IdentityController, identity_admin_controller_1.IdentityAdminController,
            tenant_license_controller_1.TenantLicenseController, system_subscription_controller_1.SystemSubscriptionController, system_admin_controller_1.SystemAdminController,
            audit_controller_1.AuditController, users_controller_1.UsersController,
        ],
        providers: [
            mongoose_database_service_1.MongooseDatabaseService, auth_service_1.AuthService, provisioning_service_1.ProvisioningService, session_service_1.SessionService,
            assets_service_1.AssetsService, asset_documents_service_1.AssetDocumentsService, warranty_service_1.WarrantyService, custom_fields_service_1.CustomFieldsService,
            tenancy_service_1.TenancyService, rbac_service_1.RbacService, identity_service_1.IdentityService, identity_security_cache_service_1.IdentitySecurityCacheService,
            tenant_license_service_1.TenantLicenseService, system_subscription_service_1.SystemSubscriptionService, system_admin_service_1.SystemAdminService, audit_service_1.AuditService,
            { provide: core_1.APP_INTERCEPTOR, useClass: audit_interceptor_1.AuditInterceptor },
            users_service_1.UsersService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map