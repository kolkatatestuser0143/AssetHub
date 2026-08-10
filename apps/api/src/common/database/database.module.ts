import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TenantModelName, TenantSchema } from '../../models/tenancy.schemas';
import { CompanyModelName, CompanySchema } from '../../models/tenancy.schemas';
import { BusinessUnitModelName, BusinessUnitSchema } from '../../models/tenancy.schemas';
import { PlantModelName, PlantSchema } from '../../models/tenancy.schemas';
import { LocationModelName, LocationSchema } from '../../models/tenancy.schemas';
import { DepartmentModelName, DepartmentSchema } from '../../models/tenancy.schemas';

import { UserModelName, UserSchema } from '../../models/user.schemas';
import { SessionModelName, SessionSchema } from '../../models/user.schemas';
import { LoginHistoryModelName, LoginHistorySchema } from '../../models/user.schemas';

import { PermissionModelName, PermissionSchema } from '../../models/rbac.schemas';
import { RoleModelName, RoleSchema } from '../../models/rbac.schemas';

import { AssetTypeModelName, AssetTypeSchema } from '../../models/asset.schemas';
import { AssetModelName, AssetSchema } from '../../models/asset.schemas';
import { AssetAuditEventModelName, AssetAuditEventSchema } from '../../models/asset.schemas';
import { AssetAssignmentModelName, AssetAssignmentSchema } from '../../models/asset.schemas';
import { VendorModelName, VendorSchema } from '../../models/asset-support.schemas';
import { WarrantyModelName, WarrantySchema } from '../../models/asset-support.schemas';
import { CustomFieldDefModelName, CustomFieldDefSchema } from '../../models/asset-support.schemas';
import { AssetCustomFieldValueModelName, AssetCustomFieldValueSchema } from '../../models/asset-support.schemas';
import { AssetDocumentModelName, AssetDocumentSchema } from '../../models/asset-support.schemas';

import { IdentityProviderConfigModelName, IdentityProviderConfigSchema } from '../../models/identity.schemas';
import { ScimTokenModelName, ScimTokenSchema } from '../../models/identity.schemas';
import { ScimSyncLogModelName, ScimSyncLogSchema } from '../../models/identity.schemas';

import { IntegrationInstanceModelName, IntegrationInstanceSchema } from '../../models/integration.schemas';

import { PlanModelName, PlanSchema } from '../../models/billing.schemas';
import { SubscriptionModelName, SubscriptionSchema } from '../../models/billing.schemas';
import { EntitlementModelName, EntitlementSchema } from '../../models/billing.schemas';

import { AuditEventModelName, AuditEventSchema } from '../../models/audit.schemas';
import { PlatformAdminNoteModelName, PlatformAdminNoteSchema } from '../../models/audit.schemas';

/**
 * Global module: connects to MongoDB (Atlas) and registers every
 * Mongoose model. Because it is @Global, any service can inject a
 * model with @InjectModel(Name) without importing MongooseModule.
 *
 * Tenant isolation is 100% application-level now — MongoDB has no RLS.
 * Every tenant-owned query MUST include { tenantId, companyId } scoping
 * (see TenantScopedRepository). There is no DB backstop; the security
 * suite is the gate (see test/security/tenant-isolation.spec.ts).
 */
const MODEL_PROVIDERS = [
  { name: TenantModelName, schema: TenantSchema },
  { name: CompanyModelName, schema: CompanySchema },
  { name: BusinessUnitModelName, schema: BusinessUnitSchema },
  { name: PlantModelName, schema: PlantSchema },
  { name: LocationModelName, schema: LocationSchema },
  { name: DepartmentModelName, schema: DepartmentSchema },
  { name: UserModelName, schema: UserSchema },
  { name: SessionModelName, schema: SessionSchema },
  { name: LoginHistoryModelName, schema: LoginHistorySchema },
  { name: PermissionModelName, schema: PermissionSchema },
  { name: RoleModelName, schema: RoleSchema },
  { name: AssetTypeModelName, schema: AssetTypeSchema },
  { name: AssetModelName, schema: AssetSchema },
  { name: AssetAuditEventModelName, schema: AssetAuditEventSchema },
  { name: AssetAssignmentModelName, schema: AssetAssignmentSchema },
  { name: VendorModelName, schema: VendorSchema },
  { name: WarrantyModelName, schema: WarrantySchema },
  { name: CustomFieldDefModelName, schema: CustomFieldDefSchema },
  { name: AssetCustomFieldValueModelName, schema: AssetCustomFieldValueSchema },
  { name: AssetDocumentModelName, schema: AssetDocumentSchema },
  { name: IdentityProviderConfigModelName, schema: IdentityProviderConfigSchema },
  { name: ScimTokenModelName, schema: ScimTokenSchema },
  { name: ScimSyncLogModelName, schema: ScimSyncLogSchema },
  { name: IntegrationInstanceModelName, schema: IntegrationInstanceSchema },
  { name: PlanModelName, schema: PlanSchema },
  { name: SubscriptionModelName, schema: SubscriptionSchema },
  { name: EntitlementModelName, schema: EntitlementSchema },
  { name: AuditEventModelName, schema: AuditEventSchema },
  { name: PlatformAdminNoteModelName, schema: PlatformAdminNoteSchema },
];

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB ?? 'itam',
      }),
    }),
    MongooseModule.forFeature(MODEL_PROVIDERS),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
