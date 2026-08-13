import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

import { DatabaseModule } from './common/database/database.module';
import { MongooseDatabaseService } from './common/mongoose-database.service';

// Auth
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { ProvisioningService } from './modules/auth/provisioning.service';
import { SessionService } from './modules/auth/session.service';

// Assets
import { AssetsController } from './modules/assets/assets.controller';
import { AssetsService } from './modules/assets/assets.service';
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

// Users
import { UsersController } from './modules/users/users.controller';
import { UsersService } from './modules/users/users.service';

@Module({
  imports: [
    DatabaseModule,

    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        algorithm: 'HS256',
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],

  controllers: [
    // Auth
    AuthController,

    // Assets
    AssetsController,
    WarrantyController,
    CustomFieldsController,

    // Tenancy
    TenancyController,

    // RBAC
    RbacController,

    // Identity
    IdentityController,

    // Users
    UsersController,
  ],

  providers: [
    // Database
    MongooseDatabaseService,

    // Auth
    AuthService,
    ProvisioningService,
    SessionService,

    // Assets
    AssetsService,
    WarrantyService,
    CustomFieldsService,

    // Tenancy
    TenancyService,

    // RBAC
    RbacService,

    // Identity
    IdentityService,
    IdentitySecurityCacheService,

    // Users
    UsersService,
  ],
})
export class AppModule {}
