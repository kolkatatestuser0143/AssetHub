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
const jwt_1 = require("@nestjs/jwt");
const throttler_1 = require("@nestjs/throttler");
const database_module_1 = require("./common/database/database.module");
const mongoose_database_service_1 = require("./common/mongoose-database.service");
const auth_controller_1 = require("./modules/auth/auth.controller");
const auth_service_1 = require("./modules/auth/auth.service");
const assets_controller_1 = require("./modules/assets/assets.controller");
const assets_service_1 = require("./modules/assets/assets.service");
const warranty_controller_1 = require("./modules/assets/warranty.controller");
const warranty_service_1 = require("./modules/assets/warranty.service");
const custom_fields_controller_1 = require("./modules/assets/custom-fields.controller");
const custom_fields_service_1 = require("./modules/assets/custom-fields.service");
const tenancy_controller_1 = require("./modules/tenancy/tenancy.controller");
const tenancy_service_1 = require("./modules/tenancy/tenancy.service");
const rbac_controller_1 = require("./modules/rbac/rbac.controller");
const rbac_service_1 = require("./modules/rbac/rbac.service");
const identity_controller_1 = require("./modules/identity/identity.controller");
const identity_service_1 = require("./modules/identity/identity.service");
const identity_security_cache_service_1 = require("./modules/identity/identity-security-cache.service");
const provisioning_service_1 = require("./modules/auth/provisioning.service");
const session_service_1 = require("./modules/auth/session.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            jwt_1.JwtModule.register({
                secret: process.env.JWT_ACCESS_SECRET,
                signOptions: { algorithm: 'HS256' },
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        ],
        controllers: [
            auth_controller_1.AuthController,
            assets_controller_1.AssetsController,
            warranty_controller_1.WarrantyController,
            custom_fields_controller_1.CustomFieldsController,
            tenancy_controller_1.TenancyController,
            rbac_controller_1.RbacController,
            identity_controller_1.IdentityController,
        ],
        providers: [
            mongoose_database_service_1.MongooseDatabaseService,
            auth_service_1.AuthService,
            assets_service_1.AssetsService,
            warranty_service_1.WarrantyService,
            custom_fields_service_1.CustomFieldsService,
            tenancy_service_1.TenancyService,
            rbac_service_1.RbacService,
            identity_service_1.IdentityService,
            identity_security_cache_service_1.IdentitySecurityCacheService,
            provisioning_service_1.ProvisioningService,
            session_service_1.SessionService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map