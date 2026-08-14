"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const identity_security_cache_service_1 = require("./identity-security-cache.service");
const oidc_provider_1 = require("./providers/oidc.provider");
const saml_provider_1 = require("./providers/saml.provider");
const provisioning_service_1 = require("../auth/provisioning.service");
const session_service_1 = require("../auth/session.service");
const enums_1 = require("../../common/enums");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let IdentityService = class IdentityService {
    constructor(db, cache, provisioning, sessions) {
        this.db = db;
        this.cache = cache;
        this.provisioning = provisioning;
        this.sessions = sessions;
    }
    async listConfigs(auth, companyId) {
        this.requireCompanyScope(auth, companyId);
        const docs = await this.db.identityProviderConfig.find({ companyId }).sort({ createdAt: -1 }).lean();
        return docs.map((doc) => ({
            id: String(doc._id),
            companyId: doc.companyId,
            protocol: doc.protocol,
            name: doc.name,
            isEnabled: doc.isEnabled,
            configKeys: Object.keys(doc.config ?? {}),
            attributeMapping: doc.attributeMapping ?? {},
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        }));
    }
    async createConfig(auth, companyId, input) {
        this.requireCompanyScope(auth, companyId);
        const exists = await this.db.identityProviderConfig.findOne({ companyId, name: input.name.trim() }).lean();
        if (exists)
            throw new common_1.ConflictException('An identity provider with this name already exists');
        const doc = await this.db.identityProviderConfig.create({
            companyId,
            protocol: input.protocol,
            name: input.name.trim(),
            config: input.config,
            attributeMapping: input.attributeMapping,
            isEnabled: true,
        });
        return { id: String(doc._id), companyId: doc.companyId, protocol: doc.protocol, name: doc.name, isEnabled: doc.isEnabled };
    }
    async setConfigEnabled(auth, companyId, idpConfigId, enabled) {
        this.requireCompanyScope(auth, companyId);
        const doc = await this.db.identityProviderConfig.findOneAndUpdate({ _id: idpConfigId, companyId }, { $set: { isEnabled: enabled } }, { new: true }).lean();
        if (!doc)
            throw new common_1.NotFoundException('Identity provider configuration not found');
        return { id: String(doc._id), isEnabled: doc.isEnabled };
    }
    async listScimTokens(auth, companyId) {
        this.requireCompanyScope(auth, companyId);
        const docs = await this.db.scimToken.find({ companyId }).sort({ createdAt: -1 }).lean();
        return docs.map((doc) => ({
            id: String(doc._id),
            companyId: doc.companyId,
            label: doc.label ?? null,
            deprovisionPolicy: doc.deprovisionPolicy,
            revokedAt: doc.revokedAt ?? null,
            createdAt: doc.createdAt,
            active: !doc.revokedAt,
        }));
    }
    async createScimToken(auth, companyId, label, deprovisionPolicy = enums_1.ScimDeprovisionPolicy.DISABLE_LOGIN) {
        this.requireCompanyScope(auth, companyId);
        const raw = `scim_${crypto.randomBytes(32).toString('hex')}`;
        const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
        const doc = await this.db.scimToken.create({ companyId, tokenHash, label: label?.trim() || undefined, deprovisionPolicy });
        return { id: String(doc._id), label: doc.label ?? null, deprovisionPolicy: doc.deprovisionPolicy, token: raw, createdAt: doc.createdAt };
    }
    async revokeScimToken(auth, companyId, tokenId) {
        this.requireCompanyScope(auth, companyId);
        const doc = await this.db.scimToken.findOneAndUpdate({ _id: tokenId, companyId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }, { new: true }).lean();
        if (!doc)
            throw new common_1.NotFoundException('Active SCIM token not found');
        return { id: String(doc._id), revokedAt: doc.revokedAt };
    }
    async listScimLogs(auth, companyId, limit = 100) {
        this.requireCompanyScope(auth, companyId);
        const tokens = await this.db.scimToken.find({ companyId }).select({ _id: 1 }).lean();
        const tokenIds = tokens.map((token) => String(token._id));
        if (!tokenIds.length)
            return [];
        const docs = await this.db.scimSyncLog.find({ scimTokenId: { $in: tokenIds } }).sort({ occurredAt: -1 }).limit(Math.min(Math.max(limit, 1), 500)).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
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
        if (!user.isActive)
            throw new common_1.UnauthorizedException('Account is inactive');
        return this.sessions.issueSession(String(user._id), ip, userAgent);
    }
    requireCompanyScope(auth, companyId) {
        if (!auth.crossCompany && auth.companyId !== companyId)
            throw new common_1.UnauthorizedException('Company out of scope');
    }
    async buildProvider(companyId, idpConfigId) {
        const config = await this.db.identityProviderConfig
            .findOne({ _id: idpConfigId, companyId, isEnabled: true })
            .lean();
        if (!config)
            throw new common_1.NotFoundException('Identity provider not configured or disabled');
        const mergedConfig = { ...(config.config ?? {}), attributeMapping: config.attributeMapping ?? {} };
        if (config.protocol === 'OIDC')
            return new oidc_provider_1.OidcProvider(mergedConfig, companyId, this.cache);
        if (config.protocol === 'SAML')
            return new saml_provider_1.SamlProvider(mergedConfig, companyId, this.cache);
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