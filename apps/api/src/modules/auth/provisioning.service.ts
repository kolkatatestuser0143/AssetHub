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
    // External identity records are always scoped to the company that owns
    // the IdP configuration. Never fall back to a global email lookup or
    // an _id-only update: either can mutate a user from another company.
    const existing = await this.db.user
      .findOne({ companyId, tenantId, externalScimId: identity.externalId })
      .lean();

    if (existing) {
      const doc = await this.db.user
        .findOneAndUpdate(
          { _id: existing._id, companyId, tenantId },
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

    // Fall back to matching by email, but only inside the same tenant and
    // company. This prevents an SSO login in Company A from attaching an
    // identity to a same-email account owned by Company B.
    const byEmail = await this.db.user
      .findOne({ email: identity.email, tenantId, companyId })
      .lean();
    if (byEmail) {
      const doc = await this.db.user
        .findOneAndUpdate(
          { _id: byEmail._id, tenantId, companyId },
          { $set: { externalScimId: identity.externalId } },
          { new: true },
        )
        .lean();
      return doc;
    }

    // Brand-new SSO user: no local password (passwordHash absent).
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
