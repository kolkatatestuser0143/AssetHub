import { Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';

@Injectable()
export class AssetTimelineService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  async get(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).select({ _id: 1, assetNumber: 1, createdAt: 1 }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');

    const [lifecycle, assignments, documents, audits, transfers, maintenance] = await Promise.all([
      this.db.assetAuditEvent.find({ tenantId: auth.tenantId, companyId: auth.companyId, assetId }).sort({ occurredAt: -1 }).lean(),
      this.db.assetAssignment.find({ assetId }).sort({ assignedAt: -1 }).lean(),
      this.db.assetDocument.find({ tenantId: auth.tenantId, companyId: auth.companyId, assetId }).sort({ createdAt: -1 }).lean(),
      this.db.auditEvent.find({ tenantId: auth.tenantId, companyId: auth.companyId, targetId: assetId }).sort({ occurredAt: -1 }).lean(),
      this.db.assetTransfer.find({ tenantId: auth.tenantId, companyId: auth.companyId, assetId }).sort({ requestedAt: -1 }).lean(),
      this.db.assetMaintenance.find({ tenantId: auth.tenantId, companyId: auth.companyId, assetId }).sort({ serviceDate: -1 }).lean(),
    ]);

    const events: Array<Record<string, unknown>> = [{ type: 'asset.created', timestamp: asset.createdAt ?? null, title: 'Asset created', description: `Asset ${asset.assetNumber} was created.`, source: 'asset', actorUserId: null }];
    for (const item of lifecycle) events.push({ type: 'lifecycle', timestamp: item.occurredAt, title: `Lifecycle: ${item.fromState ?? '—'} → ${item.toState}`, description: item.reason ?? `Asset state changed to ${item.toState}.`, source: 'asset_audit', actorUserId: item.actorUserId ?? null, metadata: { fromState: item.fromState ?? null, toState: item.toState, reason: item.reason ?? null } });
    for (const item of assignments) events.push({ type: item.returnedAt ? 'assignment.returned' : 'assignment', timestamp: item.returnedAt ?? item.assignedAt, title: item.returnedAt ? 'Asset returned' : 'Asset assigned', description: item.notes ?? (item.userId ? `Assigned to user ${item.userId}.` : 'Asset custody changed.'), source: 'assignment', actorUserId: null, metadata: { userId: item.userId ?? null, assignedAt: item.assignedAt, returnedAt: item.returnedAt ?? null } });
    for (const item of transfers) { const status = String(item.status ?? 'UNKNOWN'); events.push({ type: `transfer.${status.toLowerCase()}`, timestamp: item.completedAt ?? item.approvedAt ?? item.requestedAt ?? item.createdAt, title: `Transfer ${status.toLowerCase()}`, description: item.reason ?? item.completionNote ?? item.approvalNote ?? item.cancellationNote ?? 'Asset transfer workflow event.', source: 'transfer', actorUserId: item.completedByUserId ?? item.approvedByUserId ?? item.requestedByUserId ?? item.cancelledByUserId ?? null, metadata: { transferId: String(item._id), status, fromUserId: item.fromUserId ?? null, toUserId: item.toUserId ?? null, fromLocationId: item.fromLocationId ?? null, toLocationId: item.toLocationId ?? null, fromDepartmentId: item.fromDepartmentId ?? null, toDepartmentId: item.toDepartmentId ?? null } }); }
    for (const item of documents) events.push({ type: 'document.added', timestamp: (item as any).createdAt ?? null, title: 'Document added', description: item.fileName, source: 'document', actorUserId: null, metadata: { documentId: String((item as any)._id), fileName: item.fileName, documentType: item.documentType ?? null, sizeBytes: item.sizeBytes ?? null } });
    for (const item of maintenance) events.push({ type: 'maintenance', timestamp: item.serviceDate, title: `Maintenance · ${item.serviceType}`, description: item.notes ?? item.provider ?? item.technician ?? 'Maintenance record added.', source: 'maintenance', actorUserId: item.createdByUserId ?? null, metadata: { maintenanceId: String(item._id), serviceType: item.serviceType, provider: item.provider ?? null, technician: item.technician ?? null, nextServiceDate: item.nextServiceDate ?? null } });
    for (const item of audits) { const action = String(item.action ?? ''); if (String(item.targetType ?? '').startsWith('asset') || action.startsWith('asset.')) events.push({ type: action, timestamp: item.occurredAt, title: action.replace(/\./g, ' · '), description: item.result ?? 'Asset action recorded.', source: 'audit', actorUserId: item.actorUserId ?? null, metadata: item.metadata ?? {} }); }
    events.sort((a, b) => new Date(String(b.timestamp ?? 0)).getTime() - new Date(String(a.timestamp ?? 0)).getTime());
    return { asset: { id: String(asset._id), assetNumber: asset.assetNumber }, events };
  }
}
