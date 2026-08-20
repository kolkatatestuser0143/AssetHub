import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

@Injectable()
export class AssetTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async get(auth: AuthContext, assetId: string) {
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }, select: { id: true, assetNumber: true, createdAt: true } }));
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    const scope = { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) };
    const [lifecycle, assignments, documents, audits, transfers, maintenance, acknowledgements] = await Promise.all([
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAuditEvent.findMany({ where: { ...scope, assetId }, orderBy: { occurredAt: 'desc' } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAssignment.findMany({ where: { assetId }, orderBy: { assignedAt: 'desc' } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.findMany({ where: { ...scope, assetId }, orderBy: { createdAt: 'desc' } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.auditEvent.findMany({ where: { tenantId: auth.tenantId, targetId: assetId }, orderBy: { occurredAt: 'desc' } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.findMany({ where: { ...scope, assetId }, orderBy: { requestedAt: 'desc' } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetMaintenance.findMany({ where: { ...scope, assetId }, orderBy: { serviceDate: 'desc' } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAcknowledgement.findMany({ where: { ...scope, assetId }, orderBy: { generatedAt: 'desc' } })),
    ]);
    const events: Array<Record<string, unknown>> = [{ type: 'asset.created', timestamp: asset.createdAt, title: 'Asset created', description: `Asset ${asset.assetNumber} was created.`, source: 'asset', actorUserId: null }];
    for (const item of lifecycle) events.push({ type: 'lifecycle', timestamp: item.occurredAt, title: `Lifecycle: ${item.fromState ?? '—'} → ${item.toState}`, description: item.reason ?? `Asset state changed to ${item.toState}.`, source: 'asset_audit', actorUserId: item.actorUserId ?? null, metadata: { fromState: item.fromState ?? null, toState: item.toState, reason: item.reason ?? null } });
    for (const item of assignments) events.push({ type: item.returnedAt ? 'assignment.returned' : 'assignment', timestamp: item.returnedAt ?? item.assignedAt, title: item.returnedAt ? 'Asset returned' : 'Asset assigned', description: item.notes ?? `Assigned to user ${item.userId}.`, source: 'assignment', actorUserId: null, metadata: { userId: item.userId, assignedAt: item.assignedAt, returnedAt: item.returnedAt ?? null } });
    for (const item of transfers) { const status = String(item.status ?? 'UNKNOWN'); events.push({ type: `transfer.${status.toLowerCase()}`, timestamp: item.completedAt ?? item.approvedAt ?? item.requestedAt, title: `Transfer ${status.toLowerCase()}`, description: item.reason ?? item.completionNote ?? item.approvalNote ?? item.cancellationNote ?? 'Asset transfer workflow event.', source: 'transfer', actorUserId: item.completedByUserId ?? item.approvedByUserId ?? item.requestedByUserId ?? item.cancelledByUserId ?? null, metadata: { transferId: item.id, status, fromUserId: item.fromUserId ?? null, toUserId: item.toUserId ?? null, fromLocationId: item.fromLocationId ?? null, toLocationId: item.toLocationId ?? null, fromDepartmentId: item.fromDepartmentId ?? null, toDepartmentId: item.toDepartmentId ?? null } }); }
    for (const item of documents) events.push({ type: 'document.added', timestamp: item.createdAt, title: 'Document added', description: item.fileName, source: 'document', actorUserId: null, metadata: { documentId: item.id, fileName: item.fileName, documentType: item.documentType ?? null, sizeBytes: item.sizeBytes } });
    for (const item of maintenance) events.push({ type: 'maintenance', timestamp: item.serviceDate, title: `Maintenance · ${item.serviceType}`, description: item.notes ?? item.provider ?? item.technician ?? 'Maintenance record added.', source: 'maintenance', actorUserId: item.createdByUserId ?? null, metadata: { maintenanceId: item.id, serviceType: item.serviceType, provider: item.provider ?? null, technician: item.technician ?? null, nextServiceDate: item.nextServiceDate ?? null } });
    for (const item of acknowledgements) events.push({ type: item.status === 'ACKNOWLEDGED' ? 'acknowledgement.acknowledged' : 'acknowledgement.generated', timestamp: item.status === 'ACKNOWLEDGED' ? item.acknowledgedAt : item.generatedAt, title: item.status === 'ACKNOWLEDGED' ? 'Asset acknowledgement acknowledged' : 'Asset acknowledgement generated', description: `${item.templateName} · ${item.status === 'ACKNOWLEDGED' ? 'Employee acknowledged' : 'Awaiting employee acknowledgement'}.`, source: 'acknowledgement', actorUserId: item.status === 'ACKNOWLEDGED' ? item.acknowledgedByUserId : item.generatedByUserId, metadata: { acknowledgementId: item.id, employeeId: item.employeeId, templateName: item.templateName, generatedAt: item.generatedAt, acknowledgedAt: item.acknowledgedAt ?? null, status: item.status } });
    for (const item of audits) { const action = String(item.action ?? ''); if (String(item.targetType ?? '').startsWith('asset') || action.startsWith('asset.')) events.push({ type: action, timestamp: item.occurredAt, title: action.replace(/\./g, ' · '), description: item.result ?? 'Asset action recorded.', source: 'audit', actorUserId: item.actorUserId ?? null, metadata: item.metadata ?? {} }); }
    events.sort((a, b) => new Date(String(b.timestamp ?? 0)).getTime() - new Date(String(a.timestamp ?? 0)).getTime());
    return { asset: { id: asset.id, assetNumber: asset.assetNumber }, events };
  }
}
