import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

import { DatabaseModule } from './common/database/database.module';
import { MongooseDatabaseService } from './common/mongoose-database.service';
import { AuditInterceptor } from './common/audit/audit.interceptor';

// Auth
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { ProvisioningService } from './modules/auth/provisioning.service';
import { SessionService } from './modules/auth/session.service';
import { InviteController } from './modules/auth/invite.controller';
import { InviteService } from './modules/auth/invite.service';

// Assets
import { AssetsController } from './modules/assets/assets.controller';
import { AssetsService } from './modules/assets/assets.service';
import { AssetDocumentsController } from './modules/assets/asset-documents.controller';
import { AssetDocumentsService } from './modules/assets/asset-documents.service';
import { CustomFieldsController } from './modules/assets/custom-fields.controller';
import { CustomFieldsService } from './modules/assets/custom-fields.service';
import { WarrantyController } from './modules/assets/warranty.controller';
import { WarrantyService } from './modules/assets/warranty.service';

// Tenancy
import { TenancyController } from './modules/tenancy/tenancy.controller';
import { TenancyService } from './modules/tenancy/tenancy.service';

// RBAC
import { RbacController } from './modules/rbac/rbac.controller';
import { RbacService } from './modules/rbac/rbac.service';

// Identity
import { IdentitySecurityCacheService } from './modules/identity/identity-security-cache.service';
import { IdentityController } from './modules/identity/identity.controller';
import { IdentityService } from './modules/identity/identity.service';
import { IdentityAdminController } from './modules/identity/identity-admin.controller';

// Billing
import { TenantLicenseController } from './modules/billing/tenant-license.controller';
import { TenantLicenseService } from './modules/billing/tenant-license.service';
import { SystemSubscriptionController } from './modules/billing/system-subscription.controller';
import { SystemSubscriptionService } from './modules/billing/system-subscription.service';

// System administration
import { SystemAdminController } from './modules/system/system-admin.controller';
import { SystemAdminService } from './modules/system/system-admin.service';

// Audit
import { AuditController } from './modules/audit/audit.controller';
import { AuditService } from './modules/audit/audit.service';

// Users
import { UsersController } from './modules/users/users.controller';
import { UsersService } from './modules/users/users.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET, signOptions: { algorithm: 'HS256' } }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [
    AuthController, InviteController, AssetsController, AssetDocumentsController, WarrantyController, CustomFieldsController,
    TenancyController, RbacController, IdentityController, IdentityAdminController,
    TenantLicenseController, SystemSubscriptionController, SystemAdminController,
    AuditController, UsersController,
  ],
  providers: [
    MongooseDatabaseService, AuthService, ProvisioningService, SessionService, InviteService,
    AssetsService, AssetDocumentsService, WarrantyService, CustomFieldsService,
    TenancyService, RbacService, IdentityService, IdentitySecurityCacheService,
    TenantLicenseService, SystemSubscriptionService, SystemAdminService, AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    UsersService,
  ],
})
export class AppModule {}
