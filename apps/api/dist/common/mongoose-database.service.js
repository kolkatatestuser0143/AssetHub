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
exports.MongooseDatabaseService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const tenancy_schemas_1 = require("../models/tenancy.schemas");
const tenancy_schemas_2 = require("../models/tenancy.schemas");
const tenancy_schemas_3 = require("../models/tenancy.schemas");
const tenancy_schemas_4 = require("../models/tenancy.schemas");
const tenancy_schemas_5 = require("../models/tenancy.schemas");
const tenancy_schemas_6 = require("../models/tenancy.schemas");
const user_schemas_1 = require("../models/user.schemas");
const user_schemas_2 = require("../models/user.schemas");
const user_schemas_3 = require("../models/user.schemas");
const rbac_schemas_1 = require("../models/rbac.schemas");
const rbac_schemas_2 = require("../models/rbac.schemas");
const asset_schemas_1 = require("../models/asset.schemas");
const asset_schemas_2 = require("../models/asset.schemas");
const asset_schemas_3 = require("../models/asset.schemas");
const asset_schemas_4 = require("../models/asset.schemas");
const asset_support_schemas_1 = require("../models/asset-support.schemas");
const asset_support_schemas_2 = require("../models/asset-support.schemas");
const asset_support_schemas_3 = require("../models/asset-support.schemas");
const asset_support_schemas_4 = require("../models/asset-support.schemas");
const asset_support_schemas_5 = require("../models/asset-support.schemas");
const identity_schemas_1 = require("../models/identity.schemas");
const identity_schemas_2 = require("../models/identity.schemas");
const identity_schemas_3 = require("../models/identity.schemas");
const integration_schemas_1 = require("../models/integration.schemas");
const billing_schemas_1 = require("../models/billing.schemas");
const billing_schemas_2 = require("../models/billing.schemas");
const billing_schemas_3 = require("../models/billing.schemas");
const audit_schemas_1 = require("../models/audit.schemas");
const audit_schemas_2 = require("../models/audit.schemas");
let MongooseDatabaseService = class MongooseDatabaseService {
    constructor(tenant, company, businessUnit, plant, location, department, user, session, loginHistory, permission, role, assetType, asset, assetAuditEvent, assetAssignment, vendor, warranty, customFieldDefinition, assetCustomFieldValue, assetDocument, identityProviderConfig, scimToken, scimSyncLog, integrationInstance, plan, subscription, entitlement, auditEvent, platformAdminNote) {
        this.tenant = tenant;
        this.company = company;
        this.businessUnit = businessUnit;
        this.plant = plant;
        this.location = location;
        this.department = department;
        this.user = user;
        this.session = session;
        this.loginHistory = loginHistory;
        this.permission = permission;
        this.role = role;
        this.assetType = assetType;
        this.asset = asset;
        this.assetAuditEvent = assetAuditEvent;
        this.assetAssignment = assetAssignment;
        this.vendor = vendor;
        this.warranty = warranty;
        this.customFieldDefinition = customFieldDefinition;
        this.assetCustomFieldValue = assetCustomFieldValue;
        this.assetDocument = assetDocument;
        this.identityProviderConfig = identityProviderConfig;
        this.scimToken = scimToken;
        this.scimSyncLog = scimSyncLog;
        this.integrationInstance = integrationInstance;
        this.plan = plan;
        this.subscription = subscription;
        this.entitlement = entitlement;
        this.auditEvent = auditEvent;
        this.platformAdminNote = platformAdminNote;
    }
    async findByIdOrThrow(model, id, label) {
        const doc = await model.findById(id).lean();
        if (!doc)
            throw new common_1.NotFoundException(`${label} not found`);
        return doc;
    }
    async findOneOrThrow(model, filter, label) {
        const doc = await model.findOne(filter).lean();
        if (!doc)
            throw new common_1.NotFoundException(`${label} not found`);
        return doc;
    }
};
exports.MongooseDatabaseService = MongooseDatabaseService;
exports.MongooseDatabaseService = MongooseDatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(tenancy_schemas_1.TenantModelName)),
    __param(1, (0, mongoose_1.InjectModel)(tenancy_schemas_2.CompanyModelName)),
    __param(2, (0, mongoose_1.InjectModel)(tenancy_schemas_3.BusinessUnitModelName)),
    __param(3, (0, mongoose_1.InjectModel)(tenancy_schemas_4.PlantModelName)),
    __param(4, (0, mongoose_1.InjectModel)(tenancy_schemas_5.LocationModelName)),
    __param(5, (0, mongoose_1.InjectModel)(tenancy_schemas_6.DepartmentModelName)),
    __param(6, (0, mongoose_1.InjectModel)(user_schemas_1.UserModelName)),
    __param(7, (0, mongoose_1.InjectModel)(user_schemas_2.SessionModelName)),
    __param(8, (0, mongoose_1.InjectModel)(user_schemas_3.LoginHistoryModelName)),
    __param(9, (0, mongoose_1.InjectModel)(rbac_schemas_1.PermissionModelName)),
    __param(10, (0, mongoose_1.InjectModel)(rbac_schemas_2.RoleModelName)),
    __param(11, (0, mongoose_1.InjectModel)(asset_schemas_1.AssetTypeModelName)),
    __param(12, (0, mongoose_1.InjectModel)(asset_schemas_2.AssetModelName)),
    __param(13, (0, mongoose_1.InjectModel)(asset_schemas_3.AssetAuditEventModelName)),
    __param(14, (0, mongoose_1.InjectModel)(asset_schemas_4.AssetAssignmentModelName)),
    __param(15, (0, mongoose_1.InjectModel)(asset_support_schemas_1.VendorModelName)),
    __param(16, (0, mongoose_1.InjectModel)(asset_support_schemas_2.WarrantyModelName)),
    __param(17, (0, mongoose_1.InjectModel)(asset_support_schemas_3.CustomFieldDefModelName)),
    __param(18, (0, mongoose_1.InjectModel)(asset_support_schemas_4.AssetCustomFieldValueModelName)),
    __param(19, (0, mongoose_1.InjectModel)(asset_support_schemas_5.AssetDocumentModelName)),
    __param(20, (0, mongoose_1.InjectModel)(identity_schemas_1.IdentityProviderConfigModelName)),
    __param(21, (0, mongoose_1.InjectModel)(identity_schemas_2.ScimTokenModelName)),
    __param(22, (0, mongoose_1.InjectModel)(identity_schemas_3.ScimSyncLogModelName)),
    __param(23, (0, mongoose_1.InjectModel)(integration_schemas_1.IntegrationInstanceModelName)),
    __param(24, (0, mongoose_1.InjectModel)(billing_schemas_1.PlanModelName)),
    __param(25, (0, mongoose_1.InjectModel)(billing_schemas_2.SubscriptionModelName)),
    __param(26, (0, mongoose_1.InjectModel)(billing_schemas_3.EntitlementModelName)),
    __param(27, (0, mongoose_1.InjectModel)(audit_schemas_1.AuditEventModelName)),
    __param(28, (0, mongoose_1.InjectModel)(audit_schemas_2.PlatformAdminNoteModelName)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], MongooseDatabaseService);
//# sourceMappingURL=mongoose-database.service.js.map