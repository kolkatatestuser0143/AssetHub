import { Injectable } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
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
  constructor(private readonly db: MongooseDatabaseService) {}

  async upsertFromIdentity(companyId: string, tenantId: string, identity: NormalizedIdentity) {
    // 1. Match by (companyId, externalScimId) — the SCIM/SSO stable key.
    const existing = await this.db.user
      .findOne({ companyId, externalScimId: identity.externalId })
      .lean();

    if (existing) {
      const doc = await this.db.user
        .findOneAndUpdate(
          { _id: existing._id },
          {
            $set: {
              email: identity.email,
              firstName: identity.firstName ?? existing.firstName,
              lastName: identity.lastName ?? existing.lastName,
            },
          },
          { new: true },
        )
        .lean();
      return doc;
    }

    // 2. Fall back to matching by email — avoids duplicate User rows for
    //    someone already created manually.
    const byEmail = await this.db.user.findOne({ email: identity.email }).lean();
    if (byEmail) {
      const doc = await this.db.user
        .findOneAndUpdate(
          { _id: byEmail._id },
          { $set: { externalScimId: identity.externalId } },
          { new: true },
        )
        .lean();
      return doc;
    }

    // 3. Brand-new SSO user: no local password (passwordHash absent).
    return this.db.user.create({
      tenantId,
      companyId,
      email: identity.email,
      firstName: identity.firstName ?? '',
      lastName: identity.lastName ?? '',
      externalScimId: identity.externalId,
      isActive: true,
      forcePasswordReset: false,
      roleIds: [],
    });
  }
}
