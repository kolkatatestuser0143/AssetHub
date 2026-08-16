import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { TenantStatus } from '../../models/tenancy.schemas';
import { UserAccountType } from '../../models/user.schemas';
import { EntitlementService } from '../billing/entitlement.service';
import { SystemSubscriptionService } from '../billing/system-subscription.service';

@Injectable()
export class SystemAdminService {
  constructor(private readonly db: MongooseDatabaseService, private readonly entitlements: EntitlementService, private readonly subscriptions: SystemSubscriptionService) {}

  async overview() {
    const [tenants, users, assets, subscriptions] = await Promise.all([this.db.tenant.countDocuments(), this.db.user.countDocuments({ accountType: 'TENANT' }), this.db.asset.countDocuments(), this.db.subscription.countDocuments()]);
    return { tenants, users, assets, subscriptions };
  }

  async tenants() {
    const [tenants, subscriptions, users] = await Promise.all([
      this.db.tenant.find({}).sort({ name: 1 }).lean(),
      this.db.subscription.find({}).lean(),
      this.db.user.find({ accountType: UserAccountType.TENANT }).select({ tenantId: 1, email: 1, firstName: 1, lastName: 1, isActive: 1, forcePasswordReset: 1 }).lean(),
    ]);
    const byTenant = new Map(subscriptions.map((s: any) => [String(s.tenantId), s]));
    const admins = new Map<string, any>();
    for (const user of users as any[]) { const key = String(user.tenantId); if (!admins.has(key)) admins.set(key, user); }
    return tenants.map((tenant: any) => {
      const sub: any = byTenant.get(String(tenant._id)); const admin: any = admins.get(String(tenant._id));
      return { id: String(tenant._id), name: tenant.name, slug: tenant.slug, primaryEmail: tenant.primaryEmail ?? admin?.email ?? null, logoUrl: tenant.logoUrl ?? null, status: tenant.status ?? TenantStatus.ACTIVE, subscriptionStatus: sub?.status ?? 'unlicensed', planId: sub?.planId ?? null, endsAt: sub?.endsAt ?? null, suspendedAt: tenant.suspendedAt ?? null, suspensionReason: tenant.suspensionReason ?? null, admin: admin ? { id: String(admin._id), email: admin.email, name: `${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim(), isActive: admin.isActive !== false, forcePasswordReset: admin.forcePasswordReset === true } : null };
    });
  }

  private generateTemporaryPassword() { return `Ah-${crypto.randomBytes(9).toString('base64url')}`; }

  async createTenant(input: { name: string; slug: string; email: string; planId?: string; actorUserId?: string }) {
    const name = input.name?.trim(); const slug = input.slug?.trim().toLowerCase(); const email = input.email?.trim().toLowerCase();
    if (!name) throw new BadRequestException('Company name is required');
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) throw new BadRequestException('Tenant slug must contain only lowercase letters, numbers and hyphens');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('A valid tenant login email is required');
    if (await this.db.tenant.exists({ slug })) throw new ConflictException('Tenant slug is already in use');
    if (await this.db.user.exists({ email })) throw new ConflictException('Email is already registered');
    if (!input.planId) throw new BadRequestException('A subscription plan is required');
    const plan = await this.db.plan.findById(input.planId).lean(); if (!plan || plan.isActive === false) throw new NotFoundException('Subscription plan not found or inactive');
    const now = new Date(); const tenantId = new Types.ObjectId(); const companyId = new Types.ObjectId(); const password = this.generateTemporaryPassword(); const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const permissionDocs = await this.db.permission.find({ key: { $not: /^platform:/ } }).lean(); const roleId = new Types.ObjectId(); const rolePermissions = permissionDocs.map((p: any) => ({ permissionId: String(p._id), permissionKey: p.key }));
    await this.db.tenant.create({ _id: tenantId, name, slug, primaryEmail: email, status: TenantStatus.ACTIVE, createdAt: now, updatedAt: now });
    await this.db.company.create({ _id: companyId, tenantId: String(tenantId), name, code: slug.slice(0, 12).toUpperCase(), createdAt: now, updatedAt: now });
    await this.db.role.create({ _id: roleId, tenantId: String(tenantId), companyId: String(companyId), name: 'Tenant Admin', isSystem: true, permissions: rolePermissions, createdAt: now, updatedAt: now });
    await this.db.user.create({ tenantId: String(tenantId), companyId: String(companyId), accountType: UserAccountType.TENANT, email, passwordHash, firstName: name.split(/\s+/)[0] || 'Tenant', lastName: name.split(/\s+/).slice(1).join(' ') || 'Admin', isActive: true, forcePasswordReset: true, roleIds: [String(roleId)], backupCodesHash: [], createdAt: now, updatedAt: now });
    const subscription = await this.subscriptions.assign(String(tenantId), String(plan._id), 'active', undefined, input.actorUserId);
    await this.db.auditEvent.create({ tenantId: String(tenantId), actorUserId: input.actorUserId, action: 'tenant.created', targetType: 'tenant', targetId: String(tenantId), metadata: { name, slug, email, planId: String(plan._id) }, result: 'success', occurredAt: now });
    return { tenant: { id: String(tenantId), name, slug, primaryEmail: email, status: TenantStatus.ACTIVE, logoUrl: null }, subscription, credentials: { email, temporaryPassword: password, mustChangePassword: true } };
  }

  async resetTenantPassword(tenantId: string, actorUserId?: string) {
    if (!Types.ObjectId.isValid(tenantId)) throw new BadRequestException('Invalid tenant id');
    const tenant = await this.db.tenant.findById(tenantId).lean(); if (!tenant) throw new NotFoundException('Tenant not found');
    const user = await this.db.user.findOne({ tenantId, accountType: UserAccountType.TENANT }).sort({ createdAt: 1 }).lean(); if (!user) throw new NotFoundException('Tenant administrator not found');
    const password = this.generateTemporaryPassword(); const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.db.user.updateOne({ _id: user._id }, { $set: { passwordHash, forcePasswordReset: true, accessTokenHash: undefined, accessTokenIssuedAt: undefined, updatedAt: new Date() } });
    await this.db.session.updateMany({ userId: String(user._id), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'platform_password_reset' } });
    await this.db.auditEvent.create({ tenantId, actorUserId, action: 'tenant.password_reset', targetType: 'user', targetId: String(user._id), metadata: { email: user.email }, result: 'success', occurredAt: new Date() });
    return { tenantId, email: user.email, temporaryPassword: password, mustChangePassword: true };
  }

  async setTenantStatus(tenantId: string, active: boolean, actorUserId?: string, reason?: string) {
    const tenant = await this.db.tenant.findById(tenantId).lean(); if (!tenant) throw new NotFoundException('Tenant not found');
    if (active) await this.db.tenant.updateOne({ _id: tenantId }, { $set: { status: TenantStatus.ACTIVE }, $unset: { suspendedAt: 1, suspendedBy: 1, suspensionReason: 1 } });
    else {
      await this.db.tenant.updateOne({ _id: tenantId }, { $set: { status: TenantStatus.SUSPENDED, suspendedAt: new Date(), suspendedBy: actorUserId, suspensionReason: reason?.trim() || 'Suspended by platform administrator' } });
      const tenantUsers = await this.db.user.find({ tenantId, accountType: 'TENANT' }).select({ _id: 1 }).lean(); const userIds = tenantUsers.map((user: any) => String(user._id));
      if (userIds.length) await this.db.session.updateMany({ userId: { $in: userIds }, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'tenant_suspended' } });
    }
    await this.db.auditEvent.create({ tenantId, actorUserId, action: active ? 'tenant.activated' : 'tenant.suspended', targetType: 'tenant', targetId: tenantId, metadata: { reason: reason ?? null }, result: 'success', occurredAt: new Date() });
    return { ok: true, tenantId, status: active ? TenantStatus.ACTIVE : TenantStatus.SUSPENDED, actorUserId: actorUserId ?? null };
  }

  async updateTenantBranding(tenantId: string, input: { name?: string; logoFileId?: string; logoUrl?: string; primaryEmail?: string; phone?: string; website?: string }, actorUserId?: string) {
    if (!Types.ObjectId.isValid(tenantId)) throw new BadRequestException('Invalid tenant id');
    const tenant = await this.db.tenant.findById(tenantId).lean(); if (!tenant) throw new NotFoundException('Tenant not found');
    const set: Record<string, unknown> = {};
    for (const key of ['name', 'primaryEmail', 'phone', 'website', 'logoFileId', 'logoUrl']) { const value = input[key as keyof typeof input]; if (value !== undefined) set[key] = typeof value === 'string' ? value.trim() : value; }
    if (set.name) await this.db.company.updateMany({ tenantId }, { $set: { name: set.name } });
    const updated = await this.db.tenant.findByIdAndUpdate(tenantId, { $set: set }, { new: true }).lean();
    await this.db.auditEvent.create({ tenantId, actorUserId, action: 'tenant.branding_updated', targetType: 'tenant', targetId: tenantId, metadata: { changed: Object.keys(set) }, result: 'success', occurredAt: new Date() });
    return { id: String(updated?._id), name: updated?.name, slug: updated?.slug, primaryEmail: updated?.primaryEmail ?? null, phone: updated?.phone ?? null, website: updated?.website ?? null, logoFileId: updated?.logoFileId ?? null, logoUrl: updated?.logoUrl ?? null };
  }

  async tenantDetails(tenantId: string) {
    if (!Types.ObjectId.isValid(tenantId)) throw new BadRequestException('Invalid tenant id'); const tenant = await this.db.tenant.findById(tenantId).lean(); if (!tenant) throw new NotFoundException('Tenant not found');
    const [sub, users, companies] = await Promise.all([this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean(), this.db.user.find({ tenantId, accountType: UserAccountType.TENANT }).select({ email: 1, firstName: 1, lastName: 1, isActive: 1, forcePasswordReset: 1 }).lean(), this.db.company.find({ tenantId }).lean()]);
    return { tenant: { id: String(tenant._id), name: tenant.name, slug: tenant.slug, status: tenant.status, primaryEmail: tenant.primaryEmail ?? null, phone: tenant.phone ?? null, website: tenant.website ?? null, logoFileId: tenant.logoFileId ?? null, logoUrl: tenant.logoUrl ?? null }, subscription: sub ? { id: String(sub._id), planId: sub.planId, status: sub.status, startedAt: sub.startedAt, endsAt: sub.endsAt ?? null } : null, users: users.map((u: any) => ({ id: String(u._id), email: u.email, name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(), isActive: u.isActive !== false, forcePasswordReset: u.forcePasswordReset === true })), companies: companies.map((c: any) => ({ id: String(c._id), name: c.name, code: c.code })) };
  }

  async platformUsers() {
    const [docs, roles] = await Promise.all([this.db.user.find({ accountType: 'SYSTEM' }).sort({ lastName: 1, firstName: 1 }).lean(), this.db.role.find({ 'permissions.permissionKey': { $regex: '^platform:' } }).sort({ name: 1 }).lean()]);
    const roleMap = new Map(roles.map((r: any) => [String(r._id), { id: String(r._id), name: r.name, permissions: r.permissions ?? [] }]));
    return docs.map((u: any) => ({ id: String(u._id), email: u.email, firstName: u.firstName, lastName: u.lastName, isActive: u.isActive, roleIds: (u.roleIds ?? []).map(String), roles: (u.roleIds ?? []).map((id: string) => roleMap.get(String(id))).filter(Boolean) }));
  }

  async platformRoles() { const roles = await this.db.role.find({ $or: [{ name: 'Platform Admin' }, { 'permissions.permissionKey': { $regex: '^platform:' } }] }).sort({ name: 1 }).lean(); return roles.map((r: any) => ({ id: String(r._id), name: r.name, isSystem: !!r.isSystem, permissions: r.permissions ?? [] })); }

  async setPlatformUserRoles(userId: string, roleIds: string[], actorUserId?: string) {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid user id'); const user = await this.db.user.findOne({ _id: userId, accountType: 'SYSTEM' }).lean(); if (!user) throw new NotFoundException('Platform user not found');
    const normalized = [...new Set((roleIds ?? []).map(String))]; const validRoleIds = normalized.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)); if (normalized.length !== validRoleIds.length) throw new BadRequestException('Invalid role id');
    const roles = await this.db.role.find({ _id: { $in: validRoleIds }, 'permissions.permissionKey': { $regex: '^platform:' } }).lean(); if (roles.length !== normalized.length) throw new BadRequestException('One or more roles are not platform roles');
    if (!roles.some((role: any) => (role.permissions ?? []).some((p: any) => p.permissionKey === 'platform:console:access'))) throw new BadRequestException('At least one selected role must grant platform console access');
    await this.db.user.updateOne({ _id: user._id }, { $set: { roleIds: normalized, updatedAt: new Date() } }); return { ok: true, userId, roleIds: normalized, actorUserId: actorUserId ?? null };
  }

  async audit() { const events = await this.db.auditEvent.find({}).sort({ occurredAt: -1, createdAt: -1 }).limit(250).lean(); return events.map((e: any) => ({ id: String(e._id), tenantId: e.tenantId ?? null, actorUserId: e.actorUserId ?? null, action: e.action, resourceType: e.resourceType, resourceId: e.resourceId ?? null, result: e.result, route: e.route ?? null, method: e.method ?? null, statusCode: e.statusCode ?? null, ipAddress: e.ipAddress ?? null, occurredAt: e.occurredAt ?? e.createdAt })); }
  async health() { const now = new Date(); const [mongo] = await Promise.all([this.db.tenant.estimatedDocumentCount()]); return { status: 'healthy', checkedAt: now, checks: { api: { status: 'healthy' }, mongodb: { status: 'healthy', detail: `${mongo} tenant records visible` }, redis: { status: process.env.REDIS_URL ? 'configured' : 'not_configured' }, queueWorkers: { status: 'unknown' }, integrations: { status: 'configured' } } }; }
  async analytics() { const [tenants, users, assets, subscriptions, auditEvents] = await Promise.all([this.db.tenant.countDocuments(), this.db.user.countDocuments({ accountType: 'TENANT' }), this.db.asset.countDocuments(), this.db.subscription.countDocuments(), this.db.auditEvent.countDocuments()]); const assetByTenant = await this.db.asset.aggregate([{ $group: { _id: '$tenantId', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]); return { totals: { tenants, users, assets, subscriptions, auditEvents }, assetByTenant: assetByTenant.map((x: any) => ({ tenantId: String(x._id), count: x.count })) }; }

  private async tenantUsage(tenantId: string) {
    if (!Types.ObjectId.isValid(tenantId)) throw new BadRequestException('Invalid tenant id');
    const [companyDocs, directAssets, users, assetDocuments, subscription] = await Promise.all([
      this.db.company.find({ tenantId }).select({ _id: 1 }).lean(), this.db.asset.countDocuments({ tenantId }), this.db.user.countDocuments({ tenantId, accountType: 'TENANT' }), this.db.assetDocument.countDocuments({ tenantId }), this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean() as any,
    ]);
    const companyIds = companyDocs.map((company: any) => String(company._id));
    const [sites, vendors] = await Promise.all([
      companyIds.length ? this.db.plant.countDocuments({ companyId: { $in: companyIds } }) : 0,
      companyIds.length ? this.db.vendor.countDocuments({ companyId: { $in: companyIds } }) : 0,
    ]);
    const siteDocs = companyIds.length ? await this.db.plant.find({ companyId: { $in: companyIds } }).select({ _id: 1 }).lean() : [];
    const siteIds = (siteDocs as any[]).map((site: any) => String(site._id));
    const locationDocs = siteIds.length ? await this.db.location.find({ plantId: { $in: siteIds } }).select({ _id: 1 }).lean() : [];
    const locationIds = (locationDocs as any[]).map((location: any) => String(location._id));
    const [locations, departments, storage] = await Promise.all([
      locationIds.length ? this.db.location.countDocuments({ _id: { $in: locationIds } }) : 0,
      locationIds.length ? this.db.department.countDocuments({ locationId: { $in: locationIds } }) : 0,
      this.db.assetDocument.aggregate([{ $match: { tenantId } }, { $group: { _id: null, bytes: { $sum: { $ifNull: ['$sizeBytes', 0] } } } }]),
    ]);
    const storageBytes = Number(storage[0]?.bytes ?? 0);
    const usage = { users, assets: directAssets, companies: companyIds.length, sites, locations, departments, vendors, assetDocuments, storageBytes };
    const quotaKeys: Record<string, keyof typeof usage> = { max_users: 'users', max_assets: 'assets', max_companies: 'companies', max_sites: 'sites', max_locations: 'locations', max_departments: 'departments', max_vendors: 'vendors', max_asset_documents: 'assetDocuments', max_storage_gb: 'storageBytes' };
    const effective = subscription ? await Promise.all(Object.entries(quotaKeys).map(async ([key, usageKey]) => { try { const limit = await this.entitlements.getNumber(tenantId, key); const rawUsage = usage[usageKey]; const comparableUsage = key === 'max_storage_gb' ? Number(rawUsage) / (1024 ** 3) : Number(rawUsage); const percent = limit === null ? null : limit === 0 ? (comparableUsage > 0 ? 100 : 0) : Math.round((comparableUsage / limit) * 10000) / 100; const severity = percent === null ? 'unlimited' : percent >= 100 ? 'limit_reached' : percent >= 90 ? 'critical' : percent >= 80 ? 'warning' : 'normal'; return [key, { usage: comparableUsage, limit, percent, severity }]; } catch { return [key, { usage: Number(usage[usageKey]), limit: null, percent: null, severity: 'unavailable' }]; } })) : [];
    return { tenantId, subscription: subscription ? { id: String(subscription._id), planId: subscription.planId ?? null, status: subscription.status, startedAt: subscription.startedAt ?? null, endsAt: subscription.endsAt ?? null, graceUntil: subscription.graceUntil ?? null } : null, usage, quota: Object.fromEntries(effective) };
  }

  async usage(tenantId?: string) {
    if (tenantId) return this.tenantUsage(tenantId);
    const tenants = await this.db.tenant.find({}).select({ _id: 1, name: 1, slug: 1 }).sort({ name: 1 }).lean();
    const rows = await Promise.all(tenants.map(async (tenant: any) => ({ ...await this.tenantUsage(String(tenant._id)), tenant: { id: String(tenant._id), name: tenant.name, slug: tenant.slug } })));
    return { tenants: rows };
  }
}
