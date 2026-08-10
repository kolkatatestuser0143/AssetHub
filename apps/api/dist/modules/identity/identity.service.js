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
exports.IdentityService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const identity_security_cache_service_1 = require("./identity-security-cache.service");
const oidc_provider_1 = require("./providers/oidc.provider");
const saml_provider_1 = require("./providers/saml.provider");
const provisioning_service_1 = require("../auth/provisioning.service");
const session_service_1 = require("../auth/session.service");
let IdentityService = class IdentityService {
    constructor(db, cache, provisioning, sessions) {
        this.db = db;
        this.cache = cache;
        this.provisioning = provisioning;
        this.sessions = sessions;
    }
    async getStartUrl(companyId, idpConfigId) {
        const provider = await this.buildProvider(companyId, idpConfigId);
        return provider.getAuthorizationUrl();
    }
    async handleCallback(companyId, idpConfigId, params, ip, userAgent) {
        const provider = await this.buildProvider(companyId, idpConfigId);
        const identity = await provider.handleCallback(params);
        const company = await this.db.company.findById(companyId).lean();
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const user = await this.provisioning.upsertFromIdentity(companyId, company.tenantId, identity);
        if (!user)
            throw new common_1.NotFoundException('Provisioning failed to create user');
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        return this.sessions.issueSession(String(user._id), ip, userAgent);
    }
    async buildProvider(companyId, idpConfigId) {
        const config = await this.db.identityProviderConfig
            .findOne({ _id: idpConfigId, companyId, isEnabled: true })
            .lean();
        if (!config)
            throw new common_1.NotFoundException('Identity provider not configured or disabled');
        const mergedConfig = {
            ...(config.config ?? {}),
            attributeMapping: config.attributeMapping ?? {},
        };
        if (config.protocol === 'OIDC') {
            return new oidc_provider_1.OidcProvider(mergedConfig, companyId, this.cache);
        }
        if (config.protocol === 'SAML') {
            return new saml_provider_1.SamlProvider(mergedConfig, companyId, this.cache);
        }
        throw new common_1.NotFoundException(`Unsupported protocol: ${config.protocol}`);
    }
};
exports.IdentityService = IdentityService;
exports.IdentityService = IdentityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService,
        identity_security_cache_service_1.IdentitySecurityCacheService,
        provisioning_service_1.ProvisioningService,
        session_service_1.SessionService])
], IdentityService);
//# sourceMappingURL=identity.service.js.map