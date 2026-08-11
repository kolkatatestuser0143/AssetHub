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
exports.WarrantyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const tenant_scoped_repository_1 = require("../../common/tenant-scoped.repository");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let WarrantyService = class WarrantyService extends tenant_scoped_repository_1.TenantScopedRepository {
    constructor(db) {
        super();
        this.db = db;
    }
    async get(auth, assetId) {
        await this.requireAsset(auth, assetId);
        const warranty = await this.db.warranty.findOne({ assetId, companyId: auth.companyId }).lean();
        return warranty ? (0, mongoose_utils_1.toDto)(warranty) : null;
    }
    async upsert(auth, assetId, provider, expiresAt) {
        await this.requireAsset(auth, assetId);
        try {
            const warranty = await this.db.warranty.findOneAndUpdate({ assetId, companyId: auth.companyId }, { $set: { companyId: auth.companyId, assetId, provider, expiresAt } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
            return (0, mongoose_utils_1.toDto)(warranty);
        }
        catch (error) {
            if (error?.code === 11000)
                throw new common_1.ConflictException('Warranty already exists for this asset');
            throw error;
        }
    }
    async remove(auth, assetId) {
        await this.requireAsset(auth, assetId);
        const result = await this.db.warranty.deleteOne({ assetId, companyId: auth.companyId });
        if (result.deletedCount === 0)
            throw new common_1.NotFoundException('Warranty not found');
        return { ok: true };
    }
    async requireAsset(auth, assetId) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found in your scope');
        return asset;
    }
};
exports.WarrantyService = WarrantyService;
exports.WarrantyService = WarrantyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], WarrantyService);
//# sourceMappingURL=warranty.service.js.map