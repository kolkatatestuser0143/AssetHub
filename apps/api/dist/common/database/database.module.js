"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const tenancy_schemas_1 = require("../../models/tenancy.schemas");
const tenancy_schemas_2 = require("../../models/tenancy.schemas");
const tenancy_schemas_3 = require("../../models/tenancy.schemas");
const tenancy_schemas_4 = require("../../models/tenancy.schemas");
const tenancy_schemas_5 = require("../../models/tenancy.schemas");
const tenancy_schemas_6 = require("../../models/tenancy.schemas");
const user_schemas_1 = require("../../models/user.schemas");
const user_schemas_2 = require("../../models/user.schemas");
const user_schemas_3 = require("../../models/user.schemas");
const rbac_schemas_1 = require("../../models/rbac.schemas");
const rbac_schemas_2 = require("../../models/rbac.schemas");
const asset_schemas_1 = require("../../models/asset.schemas");
const asset_schemas_2 = require("../../models/asset.schemas");
const asset_schemas_3 = require("../../models/asset.schemas");
const asset_schemas_4 = require("../../models/asset.schemas");
const asset_support_schemas_1 = require("../../models/asset-support.schemas");
const asset_support_schemas_2 = require("../../models/asset-support.schemas");
const asset_support_schemas_3 = require("../../models/asset-support.schemas");
const asset_support_schemas_4 = require("../../models/asset-support.schemas");
const asset_support_schemas_5 = require("../../models/asset-support.schemas");
const identity_schemas_1 = require("../../models/identity.schemas");
const identity_schemas_2 = require("../../models/identity.schemas");
const identity_schemas_3 = require("../../models/identity.schemas");
const integration_schemas_1 = require("../../models/integration.schemas");
const billing_schemas_1 = require("../../models/billing.schemas");
const billing_schemas_2 = require("../../models/billing.schemas");
const billing_schemas_3 = require("../../models/billing.schemas");
const audit_schemas_1 = require("../../models/audit.schemas");
const audit_schemas_2 = require("../../models/audit.schemas");
const MODEL_PROVIDERS = [
    { name: tenancy_schemas_1.TenantModelName, schema: tenancy_schemas_1.TenantSchema },
    { name: tenancy_schemas_2.CompanyModelName, schema: tenancy_schemas_2.CompanySchema },
    { name: tenancy_schemas_3.BusinessUnitModelName, schema: tenancy_schemas_3.BusinessUnitSchema },
    { name: tenancy_schemas_4.PlantModelName, schema: tenancy_schemas_4.PlantSchema },
    { name: tenancy_schemas_5.LocationModelName, schema: tenancy_schemas_5.LocationSchema },
    { name: tenancy_schemas_6.DepartmentModelName, schema: tenancy_schemas_6.DepartmentSchema },
    { name: user_schemas_1.UserModelName, schema: user_schemas_1.UserSchema },
    { name: user_schemas_2.SessionModelName, schema: user_schemas_2.SessionSchema },
    { name: user_schemas_3.LoginHistoryModelName, schema: user_schemas_3.LoginHistorySchema },
    { name: rbac_schemas_1.PermissionModelName, schema: rbac_schemas_1.PermissionSchema },
    { name: rbac_schemas_2.RoleModelName, schema: rbac_schemas_2.RoleSchema },
    { name: asset_schemas_1.AssetTypeModelName, schema: asset_schemas_1.AssetTypeSchema },
    { name: asset_schemas_2.AssetModelName, schema: asset_schemas_2.AssetSchema },
    { name: asset_schemas_3.AssetAuditEventModelName, schema: asset_schemas_3.AssetAuditEventSchema },
    { name: asset_schemas_4.AssetAssignmentModelName, schema: asset_schemas_4.AssetAssignmentSchema },
    { name: asset_support_schemas_1.VendorModelName, schema: asset_support_schemas_1.VendorSchema },
    { name: asset_support_schemas_2.WarrantyModelName, schema: asset_support_schemas_2.WarrantySchema },
    { name: asset_support_schemas_3.CustomFieldDefModelName, schema: asset_support_schemas_3.CustomFieldDefSchema },
    { name: asset_support_schemas_4.AssetCustomFieldValueModelName, schema: asset_support_schemas_4.AssetCustomFieldValueSchema },
    { name: asset_support_schemas_5.AssetDocumentModelName, schema: asset_support_schemas_5.AssetDocumentSchema },
    { name: identity_schemas_1.IdentityProviderConfigModelName, schema: identity_schemas_1.IdentityProviderConfigSchema },
    { name: identity_schemas_2.ScimTokenModelName, schema: identity_schemas_2.ScimTokenSchema },
    { name: identity_schemas_3.ScimSyncLogModelName, schema: identity_schemas_3.ScimSyncLogSchema },
    { name: integration_schemas_1.IntegrationInstanceModelName, schema: integration_schemas_1.IntegrationInstanceSchema },
    { name: billing_schemas_1.PlanModelName, schema: billing_schemas_1.PlanSchema },
    { name: billing_schemas_2.SubscriptionModelName, schema: billing_schemas_2.SubscriptionSchema },
    { name: billing_schemas_3.EntitlementModelName, schema: billing_schemas_3.EntitlementSchema },
    { name: audit_schemas_1.AuditEventModelName, schema: audit_schemas_1.AuditEventSchema },
    { name: audit_schemas_2.PlatformAdminNoteModelName, schema: audit_schemas_2.PlatformAdminNoteSchema },
];
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forRootAsync({
                useFactory: () => ({
                    uri: process.env.MONGODB_URI,
                }),
            }),
            mongoose_1.MongooseModule.forFeature(MODEL_PROVIDERS),
        ],
        exports: [mongoose_1.MongooseModule],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map