import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class SystemTenantProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  private generateTemporaryPassword() { return `Ah-${crypto.randomBytes(9).toString('base64url')}`; }

  async createTenant(input: { name: string; slug: string; email: string; planId: string; actorUserId?: string }) {
    const name = input.name?.trim(); const slug = input.slug?.trim().toLowerCase(); const email = input.email?.trim().toLowerCase();
    if (!name) throw new BadRequestException('Organization name is required');
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) throw new BadRequestException('Organization slug must contain only lowercase letters, numbers and hyphens');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('A valid organization login email is required');
    if (!/^[0-9a-f-]{36}$/i.test(input.planId)) throw new BadRequestException('Invalid subscription plan');
    if (await this.prisma.tenant.findUnique({ where: { slug } })) throw new ConflictException('Organization slug is already in use');
    if (await this.prisma.user.findFirst({ where: { email } })) throw new ConflictException('Email is already registered');
    const plan = await this.prisma.plan.findUnique({ where: { id: input.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Subscription plan not found or inactive');

    const password = this.generateTemporaryPassword(); const passwordHash = await argon2.hash(password, { type: argon2.argon2id }); const now = new Date();
    const tenant = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name, slug, primaryEmail: email, status: 'active', createdAt: now, updatedAt: now } });
      const company = await tx.company.create({ data: { tenantId: tenant.id, name, code: slug.slice(0, 12).toUpperCase(), } });
      const roleId = crypto.randomUUID();
      const permissionRows: any[] = await tx.$queryRawUnsafe(`SELECT id::text AS id, key FROM permissions WHERE key NOT LIKE 'platform:%'`);
      await tx.$executeRawUnsafe(`INSERT INTO roles (id, tenant_id, company_id, name, is_system, created_at, updated_at) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,true,NOW(),NOW())`, roleId, tenant.id, company.id, 'Tenant Admin');
      for (const permission of permissionRows) await tx.$executeRawUnsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`, roleId, permission.id);
      const user = await tx.user.create({ data: { tenantId: tenant.id, companyId: company.id, accountType: 'TENANT', adminLevel: 'ADMIN', email, passwordHash, firstName: name.split(/\s+/)[0] || 'Organization', lastName: name.split(/\s+/).slice(1).join(' ') || 'Admin', isActive: true, forcePasswordReset: true, authVersion: 0, roleIds: [roleId], backupCodesHash: [] } });
      await tx.tenant.update({ where: { id: tenant.id }, data: { primaryUserId: user.id } });
      const subscription = await tx.subscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: 'active', startedAt: now } });
      const features = (plan.features ?? {}) as Record<string, unknown>;
      for (const [key, value] of Object.entries(features)) await tx.entitlement.create({ data: { subscriptionId: subscription.id, key, value: value as any, source: 'plan' } });
      await tx.auditEvent.create({ data: { tenantId: tenant.id, actorUserId: input.actorUserId ?? null, action: 'tenant.created', targetType: 'tenant', targetId: tenant.id, metadata: { name, slug, email, planId: plan.id }, result: 'success', occurredAt: now } });
      return { tenant, subscription };
    });

    return { tenant: { id: tenant.tenant.id, name, slug, primaryEmail: email, status: 'active', logoUrl: null }, subscription: { id: tenant.subscription.id, tenantId: tenant.tenant.id, planId: plan.id, status: tenant.subscription.status, startedAt: tenant.subscription.startedAt, endsAt: tenant.subscription.endsAt ?? null, graceUntil: tenant.subscription.graceUntil ?? null }, credentials: { email, temporaryPassword: password, mustChangePassword: true } };
  }
}
