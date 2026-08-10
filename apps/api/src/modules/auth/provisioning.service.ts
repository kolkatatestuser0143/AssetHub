import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NormalizedIdentity } from '../identity/identity-provider.interface';

/**
 * Every entry point that learns about a user from an external source —
 * SSO login callback, SCIM push, future AD/Entra sync — calls into
 * THIS service to create/update the User row. Architecture doc §8:
 * "feeds into the same auth user-provisioning path SCIM uses... avoids
 * drift between the two provisioning paths." Do not add a second
 * place that writes to the User table from external identity data.
 */
@Injectable()
export class ProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromIdentity(companyId: string, tenantId: string, identity: NormalizedIdentity) {
    const existing = await this.prisma.user.findFirst({
      where: { companyId, externalScimId: identity.externalId },
    });
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email: identity.email,
          firstName: identity.firstName ?? existing.firstName,
          lastName: identity.lastName ?? existing.lastName,
        },
      });
    }

    // Fall back to matching by email for a user that already exists
    // locally (e.g. created manually) before assuming this is brand new —
    // avoids creating duplicate User rows for the same person.
    const byEmail = await this.prisma.user.findUnique({ where: { email: identity.email } });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { externalScimId: identity.externalId },
      });
    }

    return this.prisma.user.create({
      data: {
        tenantId,
        companyId,
        email: identity.email,
        firstName: identity.firstName ?? '',
        lastName: identity.lastName ?? '',
        externalScimId: identity.externalId,
        passwordHash: null, // SSO-only user, no local password
      },
    });
  }
}
