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
exports.DepartmentSchema = exports.Department = exports.DepartmentModelName = exports.LocationSchema = exports.Location = exports.LocationModelName = exports.PlantSchema = exports.Plant = exports.PlantModelName = exports.BusinessUnitSchema = exports.BusinessUnit = exports.BusinessUnitModelName = exports.CompanySchema = exports.Company = exports.CompanyModelName = exports.TenantSchema = exports.Tenant = exports.TenantModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.TenantModelName = 'Tenant';
let Tenant = class Tenant {
};
exports.Tenant = Tenant;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Tenant.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Tenant.prototype, "slug", void 0);
exports.Tenant = Tenant = __decorate([
    (0, mongoose_1.Schema)({ collection: 'tenants', timestamps: true, versionKey: false })
], Tenant);
exports.TenantSchema = mongoose_1.SchemaFactory.createForClass(Tenant);
exports.CompanyModelName = 'Company';
let Company = class Company {
};
exports.Company = Company;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Company.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Company.prototype, "code", void 0);
exports.Company = Company = __decorate([
    (0, mongoose_1.Schema)({ collection: 'companies', timestamps: true, versionKey: false })
], Company);
exports.CompanySchema = mongoose_1.SchemaFactory.createForClass(Company);
exports.CompanySchema.index({ tenantId: 1, code: 1 }, { unique: true });
exports.BusinessUnitModelName = 'BusinessUnit';
let BusinessUnit = class BusinessUnit {
};
exports.BusinessUnit = BusinessUnit;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], BusinessUnit.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], BusinessUnit.prototype, "name", void 0);
exports.BusinessUnit = BusinessUnit = __decorate([
    (0, mongoose_1.Schema)({ collection: 'business_units', timestamps: true, versionKey: false })
], BusinessUnit);
exports.BusinessUnitSchema = mongoose_1.SchemaFactory.createForClass(BusinessUnit);
exports.PlantModelName = 'Plant';
let Plant = class Plant {
};
exports.Plant = Plant;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Plant.prototype, "businessUnitId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Plant.prototype, "name", void 0);
exports.Plant = Plant = __decorate([
    (0, mongoose_1.Schema)({ collection: 'plants', timestamps: true, versionKey: false })
], Plant);
exports.PlantSchema = mongoose_1.SchemaFactory.createForClass(Plant);
exports.LocationModelName = 'Location';
let Location = class Location {
};
exports.Location = Location;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Location.prototype, "plantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Location.prototype, "name", void 0);
exports.Location = Location = __decorate([
    (0, mongoose_1.Schema)({ collection: 'locations', timestamps: true, versionKey: false })
], Location);
exports.LocationSchema = mongoose_1.SchemaFactory.createForClass(Location);
exports.DepartmentModelName = 'Department';
let Department = class Department {
};
exports.Department = Department;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Department.prototype, "locationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Department.prototype, "name", void 0);
exports.Department = Department = __decorate([
    (0, mongoose_1.Schema)({ collection: 'departments', timestamps: true, versionKey: false })
], Department);
exports.DepartmentSchema = mongoose_1.SchemaFactory.createForClass(Department);
//# sourceMappingURL=tenancy.schemas.js.map