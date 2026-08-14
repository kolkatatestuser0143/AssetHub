import { Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';

@Injectable()
export class SystemAdminService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async overview() {
    const [tenants, users, assets, subscriptions] = await Promise.all([
      this.db.tenant.countDocuments(),
      this.db.user.countDocuments({ accountType: 'TENANT' }),
      this.db.asset.countDocuments(),
      this.db.subscription.countDocuments(),
    ]);
    return { tenants, users, assets, subscriptions };
  }

  async tenants() {
    const [tenants, subscriptions] = await Promise.all([
      this.db.tenant.find({}).sort({ name: 1 }).lean(),
      this.db.subscription.find({}).lean(),
    ]);
    const byTenant = new Map(subscriptions.map((s: any) => [String(s.tenantId), s]));
    return tenants.map((tenant: any) => {
      const sub: any = byTenant.get(String(tenant._id));
      return {
        id: String(tenant._id),
        name: tenant.name,
        slug: tenant.slug,
        subscriptionStatus: sub?.status ?? 'unlicensed',
        planId: sub?.planId ?? null,
        endsAt: sub?.endsAt ?? null,
      };
    });
  }

  async setTenantStatus(tenantId: string, active: boolean, actorUserId?: string) {
    const tenant = await this.db.tenant.findById(tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    // Tenant schema has no status field yet; subscription cancellation is the existing lifecycle signal.
    await this.db.subscription.updateMany(
      { tenantId },
      { $set: { status: active ? 'active' : 'canceled', endsAt: active ? undefined : new Date() } },
    );
    return { ok: true, tenantId, active, actorUserId: actorUserId ?? null };
  }

  async platformUsers() {
    const docs = await this.db.user.find({ accountType: 'SYSTEM' }).sort({ lastName: 1, firstName: 1 }).lean();
    return docs.map((u: any) => ({ id: String(u._id), email: u.email, firstName: u.firstName, lastName: u.lastName, isActive: u.isActive, roleIds: u.roleIds ?? [] }));
  }

  async platformRoles() {
    const roles = await this.db.role.find({ $or: [{ name: 'Platform Admin' }, { 'permissions.permissionKey': { $regex: '^platform:' } }] }).sort({ name: 1 }).lean();
    return roles.map((r: any) => ({ id: String(r._id), name: r.name, isSystem: !!r.isSystem, permissions: r.permissions ?? [] }));
  }

  async audit() {
    const events = await this.db.auditEvent.find({}).sort({ occurredAt: -1, createdAt: -1 }).limit(250).lean();
    return events.map((e: any) => ({
      id: String(e._id), tenantId: e.tenantId ?? null, actorUserId: e.actorUserId ?? null,
      action: e.action, resourceType: e.resourceType, resourceId: e.resourceId ?? null,
      result: e.result, route: e.route ?? null, method: e.method ?? null,
      statusCode: e.statusCode ?? null, ipAddress: e.ipAddress ?? null,
      occurredAt: e.occurredAt ?? e.createdAt,
    }));
  }

  async health() {
    const now = new Date();
    const [mongo] = await Promise.all([this.db.tenant.estimatedDocumentCount()]);
    return {
      status: 'healthy',
      checkedAt: now,
      checks: {
        api: { status: 'healthy' },
        mongodb: { status: 'healthy', detail: `${mongo} tenant records visible` },
        redis: { status: process.env.REDIS_URL ? 'configured' : 'not_configured' },
        queueWorkers: { status: 'unknown' },
        integrations: { status: 'configured' },
      },
    };
  }

  async analytics() {
    const [tenants, users, assets, subscriptions, auditEvents] = await Promise.all([
      this.db.tenant.countDocuments(),
      this.db.user.countDocuments({ accountType: 'TENANT' }),
      this.db.asset.countDocuments(),
      this.db.subscription.countDocuments(),
      this.db.auditEvent.countDocuments(),
    ]);
    const assetByTenant = await this.db.asset.aggregate([{ $group: { _id: '$tenantId', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]);
    return { totals: { tenants, users, assets, subscriptions, auditEvents }, assetByTenant: assetByTenant.map((x: any) => ({ tenantId: String(x._id), count: x.count })) };
  }
}
