import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './common/database/database.module';
import { MongooseDatabaseService } from './common/mongoose-database.service';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { TenantLicenseAccessInterceptor } from './common/billing/tenant-license-access.interceptor';
import { MailService } from './common/mail/mail.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { ProvisioningService } from './modules/auth/provisioning.service';
import { SessionService } from './modules/auth/session.service';
import { InviteController } from './modules/auth/invite.controller';
import { InviteService } from './modules/auth/invite.service';
import { AssetsController } from './modules/assets/assets.controller';
import { AssetsService } from './modules/assets/assets.service';
import { AssetImportService } from './modules/assets/asset-import.service';
import { AssetExcelReportService } from './modules/assets/asset-excel-report.service';
import { AssetPdfReportService } from './modules/assets/asset-pdf-report.service';
import { AssetReportTemplateController } from './modules/assets/asset-report-template.controller';
import { AssetReportTemplateService } from './modules/assets/asset-report-template.service';
import { AssetTransferService } from './modules/assets/asset-transfer.service';
import { AssetDocumentsController } from './modules/assets/asset-documents.controller';
import { AssetDocumentsService } from './modules/assets/asset-documents.service';
import { CustomFieldsController } from './modules/assets/custom-fields.controller';
import { CustomFieldsService } from './modules/assets/custom-fields.service';
import { WarrantyController } from './modules/assets/warranty.controller';
import { WarrantyService } from './modules/assets/warranty.service';
import { TenancyController } from './modules/tenancy/tenancy.controller';
import { TenancyService } from './modules/tenancy/tenancy.service';
import { RbacController } from './modules/rbac/rbac.controller';
import { RbacService } from './modules/rbac/rbac.service';
import { IdentitySecurityCacheService } from './modules/identity/identity-security-cache.service';
import { IdentityController } from './modules/identity/identity.controller';
import { IdentityService } from './modules/identity/identity.service';
import { IdentityAdminController } from './modules/identity/identity-admin.controller';
import { TenantLicenseController } from './modules/billing/tenant-license.controller';
import { TenantLicenseService } from './modules/billing/tenant-license.service';
import { EntitlementService } from './modules/billing/entitlement.service';
import { SystemSubscriptionController } from './modules/billing/system-subscription.controller';
import { SystemPlanController } from './modules/billing/system-plan.controller';
import { SystemEntitlementController } from './modules/billing/system-entitlement.controller';
import { SystemSubscriptionService } from './modules/billing/system-subscription.service';
import { PlanEntitlementSyncService } from './modules/billing/plan-entitlement-sync.service';
import { SystemEntitlementAuditService } from './modules/billing/system-entitlement-audit.service';
import { SystemAdminController } from './modules/system/system-admin.controller';
import { SystemAdminService } from './modules/system/system-admin.service';
import { AuditController } from './modules/audit/audit.controller';
import { AuditService } from './modules/audit/audit.service';
import { UsersController } from './modules/users/users.controller';
import { UsersService } from './modules/users/users.service';

@Module({
 imports:[DatabaseModule,JwtModule.register({secret:process.env.JWT_ACCESS_SECRET,signOptions:{algorithm:'HS256'}}),ThrottlerModule.forRoot([{ttl:60000,limit:100}])],
 controllers:[AuthController,InviteController,AssetsController,AssetReportTemplateController,AssetDocumentsController,WarrantyController,CustomFieldsController,TenancyController,RbacController,IdentityController,IdentityAdminController,TenantLicenseController,SystemSubscriptionController,SystemPlanController,SystemEntitlementController,SystemAdminController,AuditController,UsersController],
 providers:[MongooseDatabaseService,MailService,AuthService,ProvisioningService,SessionService,InviteService,AssetsService,AssetImportService,AssetExcelReportService,AssetPdfReportService,AssetReportTemplateService,AssetTransferService,AssetDocumentsService,WarrantyService,CustomFieldsService,TenancyService,RbacService,IdentityService,IdentitySecurityCacheService,TenantLicenseService,EntitlementService,SystemSubscriptionService,PlanEntitlementSyncService,SystemEntitlementAuditService,SystemAdminService,AuditService,{provide:APP_INTERCEPTOR,useClass:AuditInterceptor},{provide:APP_INTERCEPTOR,useClass:TenantLicenseAccessInterceptor},UsersService],
})
export class AppModule {}
