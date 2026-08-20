import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { NormalizedIdentity } from '../identity/identity-provider.interface';

/**
 * Single provisioning path for SSO, SCIM and future LDAP integrations.
 * Authentication source and AssetHub authorization are intentionally separate:
 * providers may create/update employees, but never grant AssetHub roles/scopes.
 */
@Injectable()
export class ProvisioningService {
  constructor(private readonly db: PrismaService) {}

  async upsertFromIdentity(
    companyId: string,
    tenantId: string,
    identity: NormalizedIdentity,
    provider = 'SSO',
  ) {
    const employeeId = identity.employeeId?.trim() || thisreadEmployeeId(identity.rawAttributes);

    // 1. Stable provider identity lookup.
    const existingIdentity = await this.db.$queryRawUnsafe<any[]>(
      `SELECT user_id AS "userId" FROM external_identities
       WHERE tenant_id = $1::uuid AND company_id = $2::uuid
         AND provider = $3 AND external_id = $4
       LIMIT 1`,
      tenantId,
      companyId,
      provider,
      identity.externalId,
    );

    let userId: string | undefined = existingIdentity[0]?.userId;

    // 2. Employee ID is the business identity key and wins over email.
    if (!userId && employeeId) {
      const byEmployee = await this.db.user.findFirst({
        where: { tenantId, companyId, employeeId },
        select: { id: true },
      });
      userId = byEmployee?.id;
    }

    // 3. Email is only a same-company fallback for initial linking.
    if (!userId) {
      const byEmail = await this.db.user.findFirst({
        where: { tenantId, companyId, email: identity.email },
        select: { id: true },
      });
      userId = byEmail?.id;
    }

    if (!userId) {
      const created = await this.db.user.create({
        data: {
          tenantId,
          companyId,
          employeeId: employeeId || null,
          email: identity.email,
          firstName: identity.firstName ?? '',
          lastName: identity.lastName ?? '',
          jobTitle: identity.jobTitle ?? null,
          departmentId: null,
          phone: identity.phone ?? null,
          isActive: identity.active !== false,
          forcePasswordReset: false,
          roleIds: [],
        },
      });
      userId = created.id;
    } else {
      const current = await this.db.user.findUnique({
        where: { id: userId },
        select: { id: true, employeeId: true, email: true, firstName: true, lastName: true, jobTitle: true, phone: true, isActive: true },
      });
      if (!current) throw new ConflictException('Provisioning target no longer exists');

      await this.updateProviderFields(tenantId, companyId, userId, provider, identity, employeeId, current);
    }

    // 4. Link provider identity. The unique constraint prevents duplicate
    // provider identities even when a provider retries the same request.
    const linked = await this.db.$queryRawUnsafe<any[]>(
      `INSERT INTO external_identities
        (tenant_id, company_id, user_id, provider, external_id, user_name, employee_id, status)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)
       ON CONFLICT (company_id, provider, external_id)
       DO UPDATE SET user_id=EXCLUDED.user_id,
                     user_name=EXCLUDED.user_name,
                     employee_id=EXCLUDED.employee_id,
                     status=EXCLUDED.status,
                     last_seen_at=now(),
                     updated_at=now()
       RETURNING user_id AS "userId"`,
      tenantId,
      companyId,
      userId,
      provider,
      identity.externalId,
      identity.email,
      employeeId || null,
      identity.active === false ? 'inactive' : 'active',
    );

    if (linked[0]?.userId !== userId) {
      throw new ConflictException('External identity is already linked to another user');
    }

    // Keep the legacy field populated while existing code is migrated to
    // external_identities. It is not used as the canonical identity key.
    await this.db.user.update({
      where: { id: userId },
      data: { externalScimId: provider === 'SCIM' ? identity.externalId : undefined },
    });

    return this.db.user.findUnique({ where: { id: userId } });
  }

  private async updateProviderFields(
    tenantId: string,
    companyId: string,
    userId: string,
    provider: string,
    identity: NormalizedIdentity,
    employeeId: string | undefined,
    current: { id: string; employeeId: string | null; email: string; firstName: string | null; lastName: string | null; jobTitle: string | null; phone: string | null; isActive: boolean },
  ) {
    const values: Record<string, unknown> = {};
    const candidates: Record<string, unknown> = {
      employeeId,
      email: identity.email,
      firstName: identity.firstName,
      lastName: identity.lastName,
      jobTitle: identity.jobTitle,
      phone: identity.phone,
      isActive: identity.active,
    };

    for (const [field, value] of Object.entries(candidates)) {
      if (value === undefined) continue;
      const locked = await this.db.$queryRawUnsafe<any[]>(
        `SELECT is_locked AS "isLocked" FROM user_field_provenance
         WHERE user_id = $1::uuid AND field_name = $2 LIMIT 1`,
        userId,
        field,
      );
      if (!locked[0]?.isLocked) values[field] = value;
    }

    if (Object.keys(values).length) {
      await this.db.user.update({ where: { id: userId }, data: values as any });
    }

    for (const [field, value] of Object.entries(candidates)) {
      if (value === undefined) continue;
      await this.db.$executeRawUnsafe(
        `INSERT INTO user_field_provenance
          (tenant_id, company_id, user_id, field_name, source_type, source_provider, source_external_id, last_synced_at)
         VALUES ($1::uuid,$2::uuid,$3::uuid,$4,'PROVIDER',$5,$6,now())
         ON CONFLICT (user_id, field_name)
         DO UPDATE SET source_type='PROVIDER', source_provider=EXCLUDED.source_provider,
                       source_external_id=EXCLUDED.source_external_id,
                       last_synced_at=now(), updated_at=now()
         WHERE user_field_provenance.is_locked = false`,
        tenantId,
        companyId,
        userId,
        field,
        provider,
        identity.externalId,
      );
    }
  }
}

function thisreadEmployeeId(attributes: Record<string, unknown>): string | undefined {
  const value = attributes.employeeNumber ?? attributes.employeeId ?? attributes.employee_id;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
