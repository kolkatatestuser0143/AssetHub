import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './common/prisma.service';

import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';

import { AssetsController } from './modules/assets/assets.controller';
import { AssetsService } from './modules/assets/assets.service';

import { TenancyController } from './modules/tenancy/tenancy.controller';
import { TenancyService } from './modules/tenancy/tenancy.service';

import { RbacController } from './modules/rbac/rbac.controller';
import { RbacService } from './modules/rbac/rbac.service';

import { IdentityController } from './modules/identity/identity.controller';
import { IdentityService } from './modules/identity/identity.service';
import { IdentitySecurityCacheService } from './modules/identity/identity-security-cache.service';
import { ProvisioningService } from './modules/auth/provisioning.service';
import { SessionService } from './modules/auth/session.service';

// Still-stubbed modules (SCIM, directory-sync, integrations beyond the
// mock connector, billing, notifications, platform-admin) are not
// wired here yet — see README "Next steps".

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { algorithm: 'HS256' },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController, AssetsController, TenancyController, RbacController, IdentityController],
  providers: [
    PrismaService,
    AuthService,
    AssetsService,
    TenancyService,
    RbacService,
    IdentityService,
    IdentitySecurityCacheService,
    ProvisioningService,
    SessionService,
  ],
})
export class AppModule {}
