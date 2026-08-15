import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { TenantStatus } from '../../models/tenancy.schemas';
import { EntitlementService } from '../billing/entitlement.service';

@Injectable()
export class SystemAdminService {
  constructor(private readonly db: MongooseDatabaseService, private readonly entitlements: EntitlementService) {}

  async overview() {
    const [tenants, users, assets, subscriptions] = await Promise.all([this.db.tenant.countDocuments(), this.db.user.countDocuments({ accountType: 'TENANT' }), this.db.asset.countDocuments(), this.db.subscription.countDocuments()]);
    return { tenants, users, assets, subscriptions };
  }

  async tenants() {
    const [tenants, subscriptions] = await Promise.all([this.db.tenant.find({}).sort({ name: 1 }).lean(), this.db.subscription.find({}).lean()]);
    const byTenant = new Map(subscriptions.map((s: any) => [String(s.tenantId), s]));
    return tenants.map((tenant: any) => { const sub: any = byTenant.get(String(tenant._id)); return { id: String(tenant._id), name: tenant.name, slug: tenant.slug, status: tenant.status ?? TenantStatus.ACTIVE, subscriptionStatus: sub?.status ?? 'unlicensed', planId: sub?.planId ?? null, endsAt: sub?.endsAt ?? null, suspendedAt: tenant.suspendedAt ?? null, suspensionReason: tenant.suspensionReason ?? null }; });
  }

  async setTenantStatus(tenantId: string, active: boolean, actorUserId?: string, reason?: string) {
    const tenant = await this.db.tenant.findById(tenantId).lean(); if (!tenant) throw new NotFoundException('Tenant not found');
    if (active) await this.db.tenant.updateOne({ _id: tenantId }, { $set: { status: TenantStatus.ACTIVE }, $unset: { suspendedAt: 1, suspendedBy: 1, suspensionReason: 1 } });
    else { await this.db.tenant.updateOne({ _id: tenantId }, { $set: { status: TenantStatus.SUSPENDED, suspendedAt: new Date(), suspendedBy: actorUserId, suspensionReason: reason?.trim() || 'Suspended by platform administrator' } }); const tenantUsers = await this.db.user.find({ tenantId, accountType: 'TENANT' }).select({ _id: 1 }).lean(); const userIds = tenantUsers.map((user: any) => String(user._id)); if (userIds.length) await this.db.session.updateMany({ userId: { $in: userIds }, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'tenant_suspended' } }); }
    return { ok: true, tenantId, status: active ? TenantStatus.ACTIVE : TenantStatus.SUSPENDED, actorUserId: actorUserId ?? null };
  }

  async platformUsers() { const [docs, roles] = await Promise.all([this.db.user.find({ accountType: 'SYSTEM' }).sort({ lastName: 1, firstName: 1 }).lean(), this.db.role.find({ 'permissions.permissionKey': { $regex: '^platform:' } }).sort({ name: 1 }).lean()]); const roleMap = new Map(roles.map((r: any) => [String(r._id), { id: String(r._id), name: r.name, permissions: r.permissions ?? [] }])); return docs.map((u: any) => ({ id: String(u._id), email: u.email, firstName: u.firstName, lastName: u.lastName, isActive: u.isActive, roleIds: (u.roleIds ?? []).map(String), roles: (u.roleIds ?? []).map((id: string) => roleMap.get(String(id))).filter(Boolean) })); }
  async platformRoles() { const roles = await this.db.role.find({ $or: [{ name: 'Platform Admin' }, { 'permissions.permissionKey': { $regex: '^platform:' } }] }).sort({ name: 1 }).lean(); return roles.map((r: any) => ({ id: String(r._id), name: r.name, isSystem: !!r.isSystem, permissions: r.permissions ?? [] })); }
  async setPlatformUserRoles(userId: string, roleIds: string[], actorUserId?: string) { if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid user id'); const user = await this.db.user.findOne({ _id: userId, accountType: 'SYSTEM' }).lean(); if (!user) throw new NotFoundException('Platform user not found'); const normalized = [...new Set((roleIds ?? []).map(String))]; const validRoleIds = normalized.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)); if (normalized.length !== validRoleIds.length) throw new BadRequestException('Invalid role id'); const roles = await this.db.role.find({ _id: { $in: validRoleIds }, 'permissions.permissionKey': { $regex: '^platform:' } }).lean(); if (roles.length !== normalized.length) throw new BadRequestException('One or more roles are not platform roles'); if (!roles.some((role: any) => (role.permissions ?? []).some((p: any) => p.permissionKey === 'platform:console:access'))) throw new BadRequestException('At least one selected role must grant platform console access'); await this.db.user.updateOne({ _id: user._id }, { $set: { roleIds: normalized, updatedAt: new Date() } }); return { ok: true, userId, roleIds: normalized, actorUserId: actorUserId ?? null }; }
  async audit() { const events = await this.db.auditEvent.find({}).sort({ occurredAt: -1, createdAt: -1 }).limit(250).lean(); return events.map((e: any) => ({ id: String(e._id), tenantId: e.tenantId ?? null, actorUserId: e.actorUserId ?? null, action: e.action, resourceType: e.resourceType, resourceId: e.resourceId ?? null, result: e.result, route: e.route ?? null, method: e.method ?? null, statusCode: e.statusCode ?? null, ipAddress: e.ipAddress ?? null, occurredAt: e.occurredAt ?? e.createdAt })); }
  async health() { const now = new Date(); const [mongo] = await Promise.all([this.db.tenant.estimatedDocumentCount()]); return { status: 'healthy', checkedAt: now, checks: { api: { status: 'healthy' }, mongodb: { status: 'healthy', detail: `${mongo} tenant records visible` }, redis: { status: process.env.REDIS_URL ? 'configured' : 'not_configured' }, queueWorkers: { status: 'unknown' }, integrations: { status: 'configured' } } }; }
  async analytics() { const [tenants, users, assets, subscriptions, auditEvents] = await Promise.all([this.db.tenant.countDocuments(), this.db.user.countDocuments({ accountType: 'TENANT' }), this.db.asset.countDocuments(), this.db.subscription.countDocuments(), this.db.auditEvent.countDocuments()]); const assetByTenant = await this.db.asset.aggregate([{ $group: { _id: '$tenantId', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]); return { totals: { tenants, users, assets, subscriptions, auditEvents }, assetByTenant: assetByTenant.map((x: any) => ({ tenantId: String(x._id), count: x.count })) }; }

  private async tenantUsage(tenantId: string) {
    if (!Types.ObjectId.isValid(tenantId)) throw new BadRequestException('Invalid tenant id');
    const [companyDocs, directAssets, users, assetDocuments, subscription] = await Promise.all([this.db.company.find({ tenantId }).select({ _id: 1 }).lean(), this.db.asset.countDocuments({ tenantId }), this.db.user.countDocuments({ tenantId, accountType: 'TENANT' }), this.db.assetDocument.countDocuments({ tenantId }), this.db.subscription.findOne({ tenantId }).sort({ createdAt: -1 }).lean()]);
    const companyIds = companyDocs.map((company: any) => String(company._id));
    const [businessUnits, vendors, businessUnitDocs] = await Promise.all([companyIds.length ? this.db.businessUnit.countDocuments({ companyId: { $in: companyIds } }) : 0, companyIds.length ? this.db.vendor.countDocuments({ companyId: { $in: companyIds } }) : 0, companyIds.length ? this.db.businessUnit.find({ companyId: { $in: companyIds } }).select({ _id: 1 }).lean() : []]);
    const businessUnitIds = (businessUnitDocs as any[]).map((bu: any) => String(bu._id));
    const plantDocs = businessUnitIds.length ? await this.db.plant.find({ businessUnitId: { $in: businessUnitIds } }).select({ _id: 1 }).lean() : [];
    const plantIds = plantDocs.map((plant: any) => String(plant._id));
    const locationDocs = plantIds.length ? await this.db.location.find({ plantId: { $in: plantIds } }).select({ _id: 1 }).lean() : [];
    const locationIds = locationDocs.map((location: any) => String(location._id));
    const [plants, locations, departments, storage] = await Promise.all([plantIds.length ? this.db.plant.countDocuments({ _id: { $in: plantIds } }) : 0, locationIds.length ? this.db.location.countDocuments({ _id: { $in: locationIds } }) : 0, locationIds.length ? this.db.department.countDocuments({ locationId: { $in: locationIds } }) : 0, this.db.assetDocument.aggregate([{ $match: { tenantId } }, { $group: { _id: null, bytes: { $sum: { $ifNull: ['$sizeBytes', 0] } } } }])]);
    const storageBytes = Number(storage[0]?.bytes ?? 0);
    const usage = { users, assets: directAssets, companies: companyIds.length, businessUnits, plants, locations, departments, vendors, assetDocuments, storageBytes };
    const quotaKeys: Record<string, keyof typeof usage> = { max_users: 'users', max_assets: 'assets', max_companies: 'companies', max_business_units: 'businessUnits', max_plants: 'plants', max_locations: 'locations', max_departments: 'departments', max_vendors: 'vendors', max_asset_documents: 'assetDocuments', max_storage_gb: 'storageBytes' };
    const effective = subscription ? await Promise.all(Object.entries(quotaKeys).map(async ([key, usageKey]) => { try { const limit = await this.entitlements.getNumber(tenantId, key); const rawUsage = usage[usageKey]; const comparableUsage = key === 'max_storage_gb' ? Number(rawUsage) / (1024 ** 3) : Number(rawUsage); const percent = limit === null ? null : limit === 0 ? (comparableUsage > 0 ? 100 : 0) : Math.round((comparableUsage / limit) * 10000) / 100; const severity = percent === null ? 'unlimited' : percent >= 100 ? 'limit_reached' : percent >= 90 ? 'critical' : percent >= 80 ? 'warning' : 'normal'; return [key, { usage: comparableUsage, limit, percent, severity }]; } catch { return [key, { usage: Number(usage[usageKey]), limit: null, percent: null, severity: 'unavailable' }]; } })) : [];
    const quota = Object.fromEntries(effective);
    const sub = subscription as any;
    return { tenantId, subscription: subscription ? { id: String(subscription._id), planId: subscription.planId ?? null, status: subscription.status, startedAt: subscription.startedAt ?? null, endsAt: subscription.endsAt ?? null, graceUntil: sub.graceUntil ?? null } : null, usage, quota };
  }

  async usage(tenantId?: string) { if (tenantId) return this.tenantUsage(tenantId); const tenants = await this.db.tenant.find({}).select({ _id: 1, name: 1, slug: 1 }).sort({ name: 1 }).lean(); const rows = await Promise.all(tenants.map(async (tenant: any) => ({ ...await this.tenantUsage(String(tenant._id)), tenant: { id: String(tenant._id), name: tenant.name, slug: tenant.slug } }))); return { tenants: rows }; }
}
