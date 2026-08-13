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
exports.TenancyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const tenant_scoped_repository_1 = require("../../common/tenant-scoped.repository");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let TenancyService = class TenancyService extends tenant_scoped_repository_1.TenantScopedRepository {
    constructor(db) {
        super();
        this.db = db;
    }
    async listCompanies(auth) {
        const docs = await this.db.company.find(this.scope(auth)).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createCompany(auth, name, code) {
        const doc = await this.db.company.create({
            tenantId: auth.tenantId,
            name,
            code,
        });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async listBusinessUnits(auth, companyId) {
        await this.assertCompanyInScope(auth, companyId);
        const docs = await this.db.businessUnit.find({ companyId }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createBusinessUnit(auth, companyId, name) {
        await this.assertCompanyInScope(auth, companyId);
        const doc = await this.db.businessUnit.create({ companyId, name });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async listPlants(auth, businessUnitId) {
        const bu = await this.db.businessUnit.findById(businessUnitId).lean();
        if (!bu)
            throw new common_1.NotFoundException('BusinessUnit not found');
        await this.assertCompanyInScope(auth, bu.companyId);
        const docs = await this.db.plant.find({ businessUnitId }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createPlant(auth, businessUnitId, name) {
        const bu = await this.db.businessUnit.findById(businessUnitId).lean();
        if (!bu)
            throw new common_1.NotFoundException('BusinessUnit not found');
        await this.assertCompanyInScope(auth, bu.companyId);
        const doc = await this.db.plant.create({ businessUnitId, name });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async listLocations(auth, plantId) {
        const plant = await this.db.plant.findById(plantId).lean();
        if (!plant)
            throw new common_1.NotFoundException('Plant not found');
        const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
        if (!bu)
            throw new common_1.NotFoundException('BusinessUnit not found');
        await this.assertCompanyInScope(auth, bu.companyId);
        const docs = await this.db.location.find({ plantId }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createLocation(auth, plantId, name) {
        const plant = await this.db.plant.findById(plantId).lean();
        if (!plant)
            throw new common_1.NotFoundException('Plant not found');
        const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
        if (!bu)
            throw new common_1.NotFoundException('BusinessUnit not found');
        await this.assertCompanyInScope(auth, bu.companyId);
        const doc = await this.db.location.create({ plantId, name });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async listDepartments(auth, locationId) {
        const location = await this.db.location.findById(locationId).lean();
        if (!location)
            throw new common_1.NotFoundException('Location not found');
        const plant = await this.db.plant.findById(location.plantId).lean();
        if (!plant)
            throw new common_1.NotFoundException('Plant not found');
        const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
        if (!bu)
            throw new common_1.NotFoundException('BusinessUnit not found');
        await this.assertCompanyInScope(auth, bu.companyId);
        const docs = await this.db.department.find({ locationId }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createDepartment(auth, locationId, name) {
        const location = await this.db.location.findById(locationId).lean();
        if (!location)
            throw new common_1.NotFoundException('Location not found');
        const plant = await this.db.plant.findById(location.plantId).lean();
        if (!plant)
            throw new common_1.NotFoundException('Plant not found');
        const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
        if (!bu)
            throw new common_1.NotFoundException('BusinessUnit not found');
        await this.assertCompanyInScope(auth, bu.companyId);
        const doc = await this.db.department.create({ locationId, name });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async assertCompanyInScope(auth, companyId) {
        if (!auth.crossCompany && auth.companyId !== companyId) {
            throw new common_1.ForbiddenException('Company out of scope for this user');
        }
    }
};
exports.TenancyService = TenancyService;
exports.TenancyService = TenancyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], TenancyService);
//# sourceMappingURL=tenancy.service.js.map