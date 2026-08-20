import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { EntitlementService } from '../billing/entitlement.service';
import { SystemSubscriptionService } from '../billing/system-subscription.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class SystemAdminService {
  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementService, private readonly subscriptions: SystemSubscriptionService) {}

  private generateTemporaryPassword() { return `Ah-${crypto.randomBytes(9).toString('base64url')}`; }

  private async recordAudit(actorUserId: string | undefined, action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown>) {
    const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([key]) => !/password|token|secret|authorization|cookie|refresh|access[_-]?token|private[_-]?key/i.test(key)));
    await this.prisma.$executeRawUnsafe(`INSERT INTO system_audit_events (actor_user_id, action, target_type, target_id, metadata, result, occurred_at) VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, NOW())`, actorUserId ?? null, action, targetType, targetId, JSON.stringify(safeMetadata), 'success');
  }

  async overview() {
    const [tenants, users, assets, subscriptions] = await Promise.all([this.prisma.tenant.count(), this.prisma.user.count({ where: { accountType: 'TENANT' } }), this.prisma.asset.count(), this.prisma.subscription.count()]);
    return { tenants, users, assets, subscriptions };
  }

  async tenants() {
    const [tenants, subscriptions, users] = await Promise.all([
      this.prisma.tenant.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.subscription.findMany({ orderBy: { startedAt: 'desc' } }),
      this.prisma.user.findMany({ where: { accountType: 'TENANT' }, select: { id: true, tenantId: true, email: true, firstName: true, lastName: true, isActive: true, forcePasswordReset: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    const byTenant = new Map<string, any>(); for (const sub of subscriptions) if (!byTenant.has(sub.tenantId)) byTenant.set(sub.tenantId, sub);
    const admins = new Map<string, any>(); for (const user of users) if (!admins.has(user.tenantId)) admins.set(user.tenantId, user);
    return tenants.map((tenant) => { const sub = byTenant.get(tenant.id); const admin = admins.get(tenant.id); return { id: tenant.id, name: tenant.name, slug: tenant.slug, primaryEmail: tenant.primaryEmail ?? admin?.email ?? null, logoUrl: tenant.logoUrl ?? null, status: tenant.status, subscriptionStatus: sub?.status ?? 'unlicensed', planId: sub?.planId ?? null, endsAt: sub?.endsAt ?? null, suspendedAt: tenant.suspendedAt ?? null, suspensionReason: tenant.suspensionReason ?? null, admin: admin ? { id: admin.id, email: admin.email, name: `${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim(), isActive: admin.isActive, forcePasswordReset: admin.forcePasswordReset } : null }; });
  }

  async resetTenantPassword(tenantId: string, actorUserId?: string) {
    if (!UUID_RE.test(tenantId)) throw new BadRequestException('Invalid organization id');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } }); if (!tenant) throw new NotFoundException('Organization not found');
    const user = await this.prisma.user.findFirst({ where: { tenantId, accountType: 'TENANT' }, orderBy: { createdAt: 'asc' } }); if (!user) throw new NotFoundException('Organization administrator not found');
    const password = this.generateTemporaryPassword(); const passwordHash = await argon2.hash(password, { type: argon2.argon2id }); const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, forcePasswordReset: true, accessTokenHash: null, accessTokenIssuedAt: null, updatedAt: now, authVersion: { increment: 1 } } }),
      this.prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now, revokedReason: 'platform_password_reset' } }),
    ]);
    await this.prisma.auditEvent.create({ data: { tenantId, actorUserId: actorUserId ?? null, action: 'tenant.password_reset', targetType: 'user', targetId: user.id, metadata: { email: user.email }, result: 'success', occurredAt: now } });
    return { tenantId, email: user.email, temporaryPassword: password, mustChangePassword: true };
  }

  async setTenantStatus(tenantId: string, active: boolean, actorUserId?: string, reason?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } }); if (!tenant) throw new NotFoundException('Organization not found');
    const now = new Date();
    if (active) await this.prisma.tenant.update({ where: { id: tenantId }, data: { status: 'active', suspendedAt: null, suspendedBy: null, suspensionReason: null } });
    else {
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { status: 'suspended', suspendedAt: now, suspendedBy: actorUserId ?? null, suspensionReason: reason?.trim() || 'Suspended by platform administrator' } });
      const users = await this.prisma.user.findMany({ where: { tenantId, accountType: 'TENANT' }, select: { id: true } }); const ids = users.map((u) => u.id);
      if (ids.length) await this.prisma.session.updateMany({ where: { userId: { in: ids }, revokedAt: null }, data: { revokedAt: now, revokedReason: 'tenant_suspended' } });
    }
    await this.prisma.auditEvent.create({ data: { tenantId, actorUserId: actorUserId ?? null, action: active ? 'tenant.activated' : 'tenant.suspended', targetType: 'tenant', targetId: tenantId, metadata: { reason: reason ?? null }, result: 'success', occurredAt: now } });
    return { ok: true, tenantId, status: active ? 'active' : 'suspended', actorUserId: actorUserId ?? null };
  }

  async updateTenantBranding(tenantId: string, input: { name?: string; logoFileId?: string; logoUrl?: string; primaryEmail?: string; phone?: string; website?: string }, actorUserId?: string) {
    if (!UUID_RE.test(tenantId)) throw new BadRequestException('Invalid organization id');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } }); if (!tenant) throw new NotFoundException('Organization not found');
    const data: any = {}; for (const key of ['name', 'logoFileId', 'logoUrl', 'primaryEmail', 'phone', 'website'] as const) { const value = input[key]; if (value !== undefined) data[key] = typeof value === 'string' ? value.trim() : value; }
    const updated = await this.prisma.$transaction(async (tx) => { if (data.name) await tx.company.updateMany({ where: { tenantId }, data: { name: data.name } }); return tx.tenant.update({ where: { id: tenantId }, data }); });
    await this.prisma.auditEvent.create({ data: { tenantId, actorUserId: actorUserId ?? null, action: 'tenant.branding_updated', targetType: 'tenant', targetId: tenantId, metadata: { changed: Object.keys(data) }, result: 'success', occurredAt: new Date() } });
    return { id: updated.id, name: updated.name, slug: updated.slug, primaryEmail: updated.primaryEmail ?? null, phone: updated.phone ?? null, website: updated.website ?? null, logoFileId: updated.logoFileId ?? null, logoUrl: updated.logoUrl ?? null };
  }

  async tenantDetails(tenantId: string) {
    if (!UUID_RE.test(tenantId)) throw new BadRequestException('Invalid organization id'); const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } }); if (!tenant) throw new NotFoundException('Organization not found');
    const [sub, users, companies] = await Promise.all([
      this.prisma.subscription.findFirst({ where: { tenantId }, orderBy: { startedAt: 'desc' } }),
      this.prisma.user.findMany({ where: { tenantId, accountType: 'TENANT' }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, forcePasswordReset: true } }),
      this.prisma.company.findMany({ where: { tenantId }, select: { id: true, name: true, code: true } }),
    ]);
    return { tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status, primaryEmail: tenant.primaryEmail ?? null, phone: tenant.phone ?? null, website: tenant.website ?? null, logoFileId: tenant.logoFileId ?? null, logoUrl: tenant.logoUrl ?? null }, subscription: sub ? { id: sub.id, planId: sub.planId, status: sub.status, startedAt: sub.startedAt, endsAt: sub.endsAt ?? null } : null, users: users.map((u) => ({ id: u.id, email: u.email, name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(), isActive: u.isActive, forcePasswordReset: u.forcePasswordReset })), companies };
  }

  async platformUsers() {
    const users = await this.prisma.user.findMany({ where: { accountType: 'SYSTEM' }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
    const rows: any[] = await this.prisma.$queryRawUnsafe(`SELECT r.id::text AS id, r.name, r.is_system AS "isSystem", COALESCE(json_agg(json_build_object('permissionId', p.id::text, 'permissionKey', p.key)) FILTER (WHERE p.id IS NOT NULL), '[]') AS permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id WHERE (r.tenant_id IS NULL AND r.company_id IS NULL) OR p.key LIKE 'platform:%' GROUP BY r.id ORDER BY r.name`);
    const roleMap = new Map(rows.map((r) => [String(r.id), { id: String(r.id), name: r.name, permissions: r.permissions ?? [] }]));
    return users.map((u) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, isActive: u.isActive, roleIds: u.roleIds, roles: u.roleIds.map((id) => roleMap.get(String(id))).filter(Boolean) }));
  }

  async platformRoles() {
    const rows: any[] = await this.prisma.$queryRawUnsafe(`SELECT r.id::text AS id, r.name, r.is_system AS "isSystem", COALESCE(json_agg(json_build_object('permissionId', p.id::text, 'permissionKey', p.key)) FILTER (WHERE p.id IS NOT NULL), '[]') AS permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id WHERE (r.tenant_id IS NULL AND r.company_id IS NULL) OR p.key LIKE 'platform:%' GROUP BY r.id ORDER BY r.name`);
    return rows.map((r) => ({ id: String(r.id), name: r.name, isSystem: !!r.isSystem, permissions: r.permissions ?? [] }));
  }

  async setPlatformUserRoles(userId: string, roleIds: string[], actorUserId?: string) {
    if (!UUID_RE.test(userId)) throw new BadRequestException('Invalid user id'); const user = await this.prisma.user.findFirst({ where: { id: userId, accountType: 'SYSTEM' } }); if (!user) throw new NotFoundException('Platform user not found');
    const normalized = [...new Set((roleIds ?? []).map(String))]; if (normalized.some((id) => !UUID_RE.test(id))) throw new BadRequestException('Invalid role id');
    const roles: any[] = normalized.length ? await this.prisma.$queryRawUnsafe(`SELECT r.id::text AS id, EXISTS (SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = r.id AND p.key = 'platform:console:access') AS "hasConsoleAccess" FROM roles r WHERE r.id = ANY($1::uuid[]) AND r.tenant_id IS NULL AND r.company_id IS NULL`, normalized) : [];
    if (roles.length !== normalized.length) throw new BadRequestException('One or more roles are not platform roles'); if (!roles.some((r) => r.hasConsoleAccess)) throw new BadRequestException('At least one selected role must grant platform console access');
    await this.prisma.user.update({ where: { id: user.id }, data: { roleIds: normalized, authVersion: { increment: 1 } } }); await this.recordAudit(actorUserId, 'platform.user_roles_changed', 'user', userId, { roleIds: normalized });
    return { ok: true, userId, roleIds: normalized, actorUserId: actorUserId ?? null };
  }

  async audit() {
    const [systemEvents, tenantEvents] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`SELECT id::text AS id, actor_user_id::text AS "actorUserId", action, target_type AS "targetType", target_id AS "targetId", result, route, method, status_code AS "statusCode", ip_address AS "ipAddress", occurred_at AS "occurredAt" FROM system_audit_events ORDER BY occurred_at DESC LIMIT 250`),
      this.prisma.auditEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 250 }),
    ]);
    return [...systemEvents.map((e) => ({ id: e.id, tenantId: null, actorUserId: e.actorUserId, action: e.action, resourceType: e.targetType, resourceId: e.targetId, result: e.result, route: e.route, method: e.method, statusCode: e.statusCode, ipAddress: e.ipAddress, occurredAt: e.occurredAt })), ...tenantEvents.map((e) => ({ id: e.id, tenantId: e.tenantId, actorUserId: e.actorUserId, action: e.action, resourceType: e.targetType, resourceId: e.targetId, result: e.result, route: e.route, method: e.method, statusCode: e.statusCode, ipAddress: e.ipAddress, occurredAt: e.occurredAt }))].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 500);
  }

  async health() {
    const now = new Date(); let postgres: { status: string; detail?: string } = { status: 'healthy' };
    try { await this.prisma.$queryRawUnsafe('SELECT 1'); } catch (error) { postgres = { status: 'unhealthy', detail: error instanceof Error ? error.message : 'Database check failed' }; }
    return { status: postgres.status === 'healthy' ? 'healthy' : 'degraded', checkedAt: now, checks: { api: { status: 'healthy' }, postgres, redis: { status: process.env.REDIS_URL ? 'configured' : 'not_configured' }, queueWorkers: { status: 'unknown' }, integrations: { status: 'configured' } } };
  }

  async analytics() {
    const [tenants, users, assets, subscriptions, auditEvents, assetByTenant] = await Promise.all([
      this.prisma.tenant.count(), this.prisma.user.count({ where: { accountType: 'TENANT' } }), this.prisma.asset.count(), this.prisma.subscription.count(), this.prisma.auditEvent.count(),
      this.prisma.$queryRawUnsafe<any[]>(`SELECT tenant_id::text AS "tenantId", COUNT(*)::int AS count FROM assets GROUP BY tenant_id ORDER BY count DESC LIMIT 20`),
    ]);
    return { totals: { tenants, users, assets, subscriptions, auditEvents }, assetByTenant: assetByTenant.map((x) => ({ tenantId: x.tenantId, count: Number(x.count) })) };
  }

  async usage(tenantId?: string) {
    if (tenantId && !UUID_RE.test(tenantId)) throw new BadRequestException('Invalid organization id');
    const base = tenantId ? { tenantId } : {};
    const [tenants, users, assets, companies, sites, subscriptions] = await Promise.all([
      tenantId ? this.prisma.tenant.count({ where: { id: tenantId } }) : this.prisma.tenant.count(),
      this.prisma.user.count({ where: { ...base, accountType: 'TENANT' } }), this.prisma.asset.count({ where: base }), this.prisma.company.count({ where: base }), this.prisma.site.count({ where: base }),
      tenantId ? this.prisma.subscription.findFirst({ where: { tenantId }, orderBy: { startedAt: 'desc' } }) : this.prisma.subscription.count(),
    ]);
    return tenantId ? { tenantId, users, assets, companies, sites, subscription: subscriptions && typeof subscriptions === 'object' ? { id: subscriptions.id, planId: subscriptions.planId, status: subscriptions.status, endsAt: subscriptions.endsAt ?? null } : null } : { tenants, users, assets, companies, sites, subscriptions };
  }
}
