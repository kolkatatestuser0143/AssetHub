import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantModelName, TenantSchema, CompanyModelName, CompanySchema, BusinessUnitModelName, BusinessUnitSchema, PlantModelName, PlantSchema, LocationModelName, LocationSchema, DepartmentModelName, DepartmentSchema } from '../../models/tenancy.schemas';
import { UserModelName, UserSchema, SessionModelName, SessionSchema, LoginHistoryModelName, LoginHistorySchema } from '../../models/user.schemas';
import { PermissionModelName, PermissionSchema, RoleModelName, RoleSchema } from '../../models/rbac.schemas';
import { AssetTypeModelName, AssetTypeSchema, AssetModelName, AssetSchema, AssetAuditEventModelName, AssetAuditEventSchema, AssetAssignmentModelName, AssetAssignmentSchema, AssetTransferModelName, AssetTransferSchema } from '../../models/asset.schemas';
import { VendorModelName, VendorSchema, WarrantyModelName, WarrantySchema, CustomFieldDefModelName, CustomFieldDefSchema, AssetCustomFieldValueModelName, AssetCustomFieldValueSchema, AssetDocumentModelName, AssetDocumentSchema } from '../../models/asset-support.schemas';
import { AssetMaintenanceModelName, AssetMaintenanceSchema } from '../../models/maintenance.schemas';
import { IdentityProviderConfigModelName, IdentityProviderConfigSchema, ScimTokenModelName, ScimTokenSchema, ScimSyncLogModelName, ScimSyncLogSchema } from '../../models/identity.schemas';
import { IntegrationInstanceModelName, IntegrationInstanceSchema } from '../../models/integration.schemas';
import { PlanModelName, PlanSchema, SubscriptionModelName, SubscriptionSchema, EntitlementModelName, EntitlementSchema } from '../../models/billing.schemas';
import { AuditEventModelName, AuditEventSchema, PlatformAdminNoteModelName, PlatformAdminNoteSchema } from '../../models/audit.schemas';
import { AssetReportTemplateModelName, AssetReportTemplateSchema, AssetAcknowledgementTemplateModelName, AssetAcknowledgementTemplateSchema } from '../../models/report.schemas';

const MODEL_PROVIDERS = [
  { name: TenantModelName, schema: TenantSchema }, { name: CompanyModelName, schema: CompanySchema }, { name: BusinessUnitModelName, schema: BusinessUnitSchema }, { name: PlantModelName, schema: PlantSchema }, { name: LocationModelName, schema: LocationSchema }, { name: DepartmentModelName, schema: DepartmentSchema },
  { name: UserModelName, schema: UserSchema }, { name: SessionModelName, schema: SessionSchema }, { name: LoginHistoryModelName, schema: LoginHistorySchema }, { name: PermissionModelName, schema: PermissionSchema }, { name: RoleModelName, schema: RoleSchema },
  { name: AssetTypeModelName, schema: AssetTypeSchema }, { name: AssetModelName, schema: AssetSchema }, { name: AssetAuditEventModelName, schema: AssetAuditEventSchema }, { name: AssetAssignmentModelName, schema: AssetAssignmentSchema }, { name: AssetTransferModelName, schema: AssetTransferSchema }, { name: AssetMaintenanceModelName, schema: AssetMaintenanceSchema },
  { name: VendorModelName, schema: VendorSchema }, { name: WarrantyModelName, schema: WarrantySchema }, { name: CustomFieldDefModelName, schema: CustomFieldDefSchema }, { name: AssetCustomFieldValueModelName, schema: AssetCustomFieldValueSchema }, { name: AssetDocumentModelName, schema: AssetDocumentSchema },
  { name: IdentityProviderConfigModelName, schema: IdentityProviderConfigSchema }, { name: ScimTokenModelName, schema: ScimTokenSchema }, { name: ScimSyncLogModelName, schema: ScimSyncLogSchema }, { name: IntegrationInstanceModelName, schema: IntegrationInstanceSchema }, { name: PlanModelName, schema: PlanSchema }, { name: SubscriptionModelName, schema: SubscriptionSchema }, { name: EntitlementModelName, schema: EntitlementSchema },
  { name: AuditEventModelName, schema: AuditEventSchema }, { name: PlatformAdminNoteModelName, schema: PlatformAdminNoteSchema }, { name: AssetReportTemplateModelName, schema: AssetReportTemplateSchema }, { name: AssetAcknowledgementTemplateModelName, schema: AssetAcknowledgementTemplateSchema },
];

@Global()
@Module({ imports: [MongooseModule.forRootAsync({ useFactory: () => ({ uri: process.env.MONGODB_URI }) }), MongooseModule.forFeature(MODEL_PROVIDERS)], exports: [MongooseModule] })
export class DatabaseModule {}
