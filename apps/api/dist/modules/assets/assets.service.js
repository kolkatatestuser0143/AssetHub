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
const tenant_scoped_repository_1 = require("../../common/tenant-scoped.repository");
const enums_1 = require("../../common/enums");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let AssetsService = class AssetsService extends tenant_scoped_repository_1.TenantScopedRepository {
    constructor(db) {
        super();
        this.db = db;
    }
    async listAssets(auth) {
        return (0, mongoose_utils_1.toDtoArray)(await this.db.asset.find(this.scope(auth)).sort({ createdAt: -1 }).lean());
    }
    async listAssetTypes(auth) {
        return (0, mongoose_utils_1.toDtoArray)(await this.db.assetType.find(this.scope(auth)).lean());
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
        const assetType = await this.db.assetType.findOne({ _id: assetTypeId, companyId: auth.companyId }).lean();
        if (!assetType)
            throw new common_1.NotFoundException('Asset type not found in your company');
        const locationId = this.readOptionalId(fields.locationId);
        const departmentId = this.readOptionalId(fields.departmentId);
        const vendorId = this.readOptionalId(fields.vendorId);
        if (locationId) {
            const location = await this.db.location.findById(locationId).lean();
            if (!location)
                throw new common_1.NotFoundException('Location not found');
            const plant = await this.db.plant.findById(location.plantId).lean();
            const businessUnit = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
            if (!plant || !businessUnit || businessUnit.companyId !== auth.companyId) {
                throw new common_1.ForbiddenException('locationId does not belong to your company');
            }
            if (departmentId) {
                const department = await this.db.department.findOne({ _id: departmentId, locationId: location._id }).lean();
                if (!department)
                    throw new common_1.ForbiddenException('departmentId does not belong to the selected location');
            }
        }
        else if (departmentId) {
            const department = await this.db.department.findById(departmentId).lean();
            if (!department)
                throw new common_1.NotFoundException('Department not found');
            const location = await this.db.location.findById(department.locationId).lean();
            const plant = location ? await this.db.plant.findById(location.plantId).lean() : null;
            const businessUnit = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
            if (!location || !plant || !businessUnit || businessUnit.companyId !== auth.companyId) {
                throw new common_1.ForbiddenException('departmentId does not belong to your company');
            }
        }
        if (vendorId) {
            const vendor = await this.db.vendor.findOne({ _id: vendorId, companyId: auth.companyId }).lean();
            if (!vendor)
                throw new common_1.ForbiddenException('vendorId does not belong to your company');
        }
        const assetNumber = await this.generateAssetNumber(assetTypeId);
        const customFields = { ...fields };
        delete customFields.locationId;
        delete customFields.departmentId;
        delete customFields.vendorId;
        const doc = await this.db.asset.create({
            tenantId: auth.tenantId,
            companyId: auth.companyId,
            assetTypeId,
            assetNumber,
            status: enums_1.AssetLifecycleState.IN_STOCK,
            locationId,
            departmentId,
            vendorId,
            customFields: customFields,
        });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async assignAsset(auth, assetId, userId, notes) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found in your scope');
        const user = await this.db.user.findOne({ _id: userId, tenantId: auth.tenantId, companyId: auth.companyId }).lean();
        if (!user)
            throw new common_1.NotFoundException('User not found in your company');
        if (!user.isActive)
            throw new common_1.ForbiddenException('Cannot assign an asset to an inactive user');
        const active = await this.db.assetAssignment.findOne({ assetId, returnedAt: { $exists: false } }).lean();
        if (active)
            throw new common_1.ConflictException('Asset is already assigned');
        try {
            const assignment = await this.db.assetAssignment.create({
                assetId,
                userId,
                assignedAt: new Date(),
                notes,
            });
            return (0, mongoose_utils_1.toDto)(assignment.toObject());
        }
        catch (error) {
            if (error?.code === 11000)
                throw new common_1.ConflictException('Asset is already assigned');
            throw error;
        }
    }
    async getCurrentAssignment(auth, assetId) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found in your scope');
        const assignment = await this.db.assetAssignment.findOne({ assetId, returnedAt: { $exists: false } }).lean();
        return assignment ? (0, mongoose_utils_1.toDto)(assignment) : null;
    }
    async unassignAsset(auth, assetId, notes) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found in your scope');
        const assignment = await this.db.assetAssignment.findOneAndUpdate({ assetId, returnedAt: { $exists: false } }, { $set: { returnedAt: new Date(), ...(notes ? { notes } : {}) } }, { new: true }).lean();
        if (!assignment)
            throw new common_1.NotFoundException('Asset is not currently assigned');
        return (0, mongoose_utils_1.toDto)(assignment);
    }
    async listAssignmentHistory(auth, assetId) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found in your scope');
        return (0, mongoose_utils_1.toDtoArray)(await this.db.assetAssignment.find({ assetId }).sort({ assignedAt: -1 }).lean());
    }
    readOptionalId(value) {
        if (value === undefined || value === null || value === '')
            return undefined;
        if (typeof value !== 'string')
            throw new common_1.ForbiddenException('Relationship IDs must be strings');
        return value;
    }
    async generateAssetNumber(assetTypeId) {
        const assetType = await this.db.assetType.findOneAndUpdate({ _id: assetTypeId, 'numberingRule.nextSequence': { $exists: true } }, { $inc: { 'numberingRule.nextSequence': 1 } }, { new: true }).lean();
        if (!assetType?.numberingRule)
            throw new common_1.NotFoundException('No numbering rule configured for this asset type');
        const sequence = assetType.numberingRule.nextSequence - 1;
        const rule = assetType.numberingRule;
        const company = await this.db.company.findById(assetType.companyId).lean();
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        return `${rule.prefix}${rule.separator}${company.code}${rule.separator}${String(sequence).padStart(rule.padding, '0')}`;
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
            tenantId: auth.tenantId,
            companyId: auth.companyId,
            assetId,
            fromState: before.status,
            toState,
            actorUserId,
            reason,
            occurredAt: new Date(),
        });
        return { ok: true };
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map