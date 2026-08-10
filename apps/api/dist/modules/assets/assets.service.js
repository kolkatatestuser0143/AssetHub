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
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const enums_1 = require("../../common/enums");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let AssetsService = class AssetsService {
    constructor(db) {
        this.db = db;
    }
    async listAssets(auth) {
        const docs = await this.db.asset
            .find(this.scope(auth))
            .sort({ createdAt: -1 })
            .lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async listAssetTypes(auth) {
        const docs = await this.db.assetType
            .find({ companyId: auth.companyId })
            .lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createAssetType(auth, name, numberingRule) {
        const doc = await this.db.assetType.create({
            companyId: auth.companyId,
            name,
            numberingRule: {
                prefix: numberingRule.prefix,
                separator: numberingRule.separator ?? '-',
                padding: numberingRule.padding ?? 6,
                nextSequence: 1,
            },
        });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async createAsset(auth, assetTypeId, fields) {
        const assetType = await this.db.assetType.findById(assetTypeId).lean();
        if (!assetType)
            throw new common_1.NotFoundException('Asset type not found');
        if (assetType.companyId !== auth.companyId) {
            throw new common_1.ForbiddenException('assetTypeId does not belong to your company');
        }
        const assetNumber = await this.generateAssetNumber(assetTypeId);
        const doc = await this.db.asset.create({
            tenantId: auth.tenantId,
            companyId: auth.companyId,
            assetTypeId,
            assetNumber,
            status: enums_1.AssetLifecycleState.IN_STOCK,
            customFields: fields ?? {},
        });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async generateAssetNumber(assetTypeId) {
        const assetType = await this.db.assetType
            .findOneAndUpdate({ _id: assetTypeId, 'numberingRule.nextSequence': { $exists: true } }, { $inc: { 'numberingRule.nextSequence': 1 } }, { new: true })
            .lean();
        if (!assetType?.numberingRule) {
            throw new common_1.NotFoundException('No numbering rule configured for this asset type');
        }
        const sequence = assetType.numberingRule.nextSequence - 1;
        const rule = assetType.numberingRule;
        const company = await this.db.company.findById(assetType.companyId).lean();
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const padded = String(sequence).padStart(rule.padding, '0');
        return `${rule.prefix}${rule.separator}${company.code}${rule.separator}${padded}`;
    }
    async transitionState(auth, assetId, toState, actorUserId, reason) {
        const filter = this.scope(auth);
        const before = await this.db.asset.findOne({ _id: assetId, ...filter }).lean();
        if (!before)
            throw new common_1.NotFoundException('Asset not found in your scope');
        const updated = await this.db.asset.findOneAndUpdate({ _id: assetId, ...filter }, { $set: { status: toState } }, { new: true }).lean();
        if (!updated)
            throw new common_1.NotFoundException('Asset not found in your scope');
        await this.db.assetAuditEvent.create({
            assetId: assetId,
            fromState: before.status,
            toState,
            actorUserId,
            reason,
            occurredAt: new Date(),
        });
        return { ok: true };
    }
    scope(auth) {
        return auth.crossCompany
            ? { tenantId: auth.tenantId }
            : { tenantId: auth.tenantId, companyId: auth.companyId };
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map