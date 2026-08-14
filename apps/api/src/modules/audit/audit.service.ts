import { Injectable } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { toDtoArray } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';

export type AuditWriteInput = {
  tenantId: string;
  companyId?: string;
  actorUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditQuery = {
  action?: string;
  targetType?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

@Injectable()
export class AuditService {
  constructor(private readonly db: MongooseDatabaseService, private readonly entitlements: EntitlementService) {}

  async record(input: AuditWriteInput): Promise<void> {
    if (!input.tenantId) return;
    const sensitive = /password|token|secret|authorization|cookie|refresh|access[_-]?token|private[_-]?key/i;
    const metadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input.metadata ?? {})) {
      if (sensitive.test(key)) continue;
      metadata[key] = typeof value === 'string' && value.length > 2000 ? value.slice(0, 2000) : value;
    }
    await this.db.auditEvent.create({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata,
      occurredAt: new Date(),
    });
  }

  async purgeExpired(tenantId: string) {
    const retentionDays = await this.entitlements.getNumber(tenantId, 'audit_retention_days');
    if (retentionDays === null) return { deleted: 0, retentionDays: null };
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.db.auditEvent.deleteMany({ tenantId, occurredAt: { $lt: cutoff } });
    return { deleted: result.deletedCount ?? 0, retentionDays, cutoff };
  }

  async list(auth: AuthContext, query: AuditQuery = {}) {
    const filter: Record<string, any> = { tenantId: auth.tenantId };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    if (query.action) filter.action = query.action;
    if (query.targetType) filter.targetType = query.targetType;
    if (query.actorUserId) filter.actorUserId = query.actorUserId;
    if (query.from || query.to) {
      filter.occurredAt = {};
      if (query.from) filter.occurredAt.$gte = query.from;
      if (query.to) filter.occurredAt.$lte = query.to;
    }
    const limit = Math.min(Math.max(query.limit ?? 200, 1), 1000);
    const docs = await this.db.auditEvent.find(filter).sort({ occurredAt: -1 }).limit(limit).lean();
    return toDtoArray(docs);
  }

  async summary(auth: AuthContext) {
    const filter: Record<string, any> = { tenantId: auth.tenantId };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    const [total, actionAgg, targetAgg, today] = await Promise.all([
      this.db.auditEvent.countDocuments(filter),
      this.db.auditEvent.aggregate([{ $match: filter }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      this.db.auditEvent.aggregate([{ $match: filter }, { $group: { _id: '$targetType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      this.db.auditEvent.countDocuments({ ...filter, occurredAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    ]);
    return {
      total,
      today,
      topActions: actionAgg.map((row: any) => ({ action: row._id, count: row.count })),
      byTargetType: targetAgg.map((row: any) => ({ targetType: row._id ?? 'unknown', count: row.count })),
    };
  }

  async csv(auth: AuthContext) {
    const events = await this.list(auth, { limit: 1000 });
    const escape = (value: unknown) => {
      const text = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const header = ['occurredAt', 'action', 'targetType', 'targetId', 'actorUserId', 'metadata'];
    const rows = events.map((event: any) => [event.occurredAt, event.action, event.targetType, event.targetId, event.actorUserId, event.metadata].map(escape).join(','));
    return [header.join(','), ...rows].join('\n');
  }
}
