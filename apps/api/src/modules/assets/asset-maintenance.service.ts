import { Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

export type MaintenanceType = 'REPAIR' | 'PREVENTIVE' | 'INSPECTION' | 'OTHER';

@Injectable()
export class AssetMaintenanceService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  private async asset(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }

  async list(auth: AuthContext, assetId: string) {
    await this.asset(auth, assetId);
    return toDtoArray(await this.db.assetMaintenance.find({ assetId, tenantId: auth.tenantId, companyId: auth.companyId }).sort({ serviceDate: -1, createdAt: -1 }).lean());
  }

  async create(auth: AuthContext, assetId: string, input: { serviceDate: string; serviceType: MaintenanceType; provider?: string; technician?: string; notes?: string; nextServiceDate?: string; attachmentDocumentId?: string }) {
    await this.asset(auth, assetId);
    const doc = await this.db.assetMaintenance.create({
      tenantId: auth.tenantId,
      companyId: auth.companyId,
      assetId,
      serviceDate: new Date(input.serviceDate),
      serviceType: input.serviceType,
      provider: input.provider?.trim() || undefined,
      technician: input.technician?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      nextServiceDate: input.nextServiceDate ? new Date(input.nextServiceDate) : undefined,
      attachmentDocumentId: input.attachmentDocumentId,
      createdByUserId: auth.userId,
    });
    await this.db.auditEvent.create({ tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'asset.maintenance.created', targetType: 'asset_maintenance', targetId: String(doc._id), metadata: { assetId, serviceType: input.serviceType }, result: 'success', occurredAt: new Date() });
    return toDto(doc.toObject());
  }

  async update(auth: AuthContext, assetId: string, recordId: string, input: { serviceDate?: string; serviceType?: MaintenanceType; provider?: string; technician?: string; notes?: string; nextServiceDate?: string }) {
    await this.asset(auth, assetId);
    const doc = await this.db.assetMaintenance.findOneAndUpdate(
      { _id: recordId, assetId, tenantId: auth.tenantId, companyId: auth.companyId },
      { $set: {
        ...(input.serviceDate ? { serviceDate: new Date(input.serviceDate) } : {}),
        ...(input.serviceType ? { serviceType: input.serviceType } : {}),
        ...(input.provider !== undefined ? { provider: input.provider.trim() || undefined } : {}),
        ...(input.technician !== undefined ? { technician: input.technician.trim() || undefined } : {}),
        ...(input.notes !== undefined ? { notes: input.notes.trim() || undefined } : {}),
        ...(input.nextServiceDate !== undefined ? { nextServiceDate: input.nextServiceDate ? new Date(input.nextServiceDate) : undefined } : {}),
      } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('Maintenance record not found');
    await this.db.auditEvent.create({ tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'asset.maintenance.updated', targetType: 'asset_maintenance', targetId: recordId, metadata: { assetId }, result: 'success', occurredAt: new Date() });
    return toDto(doc);
  }

  async remove(auth: AuthContext, assetId: string, recordId: string) {
    await this.asset(auth, assetId);
    const result = await this.db.assetMaintenance.deleteOne({ _id: recordId, assetId, tenantId: auth.tenantId, companyId: auth.companyId });
    if (!result.deletedCount) throw new NotFoundException('Maintenance record not found');
    await this.db.auditEvent.create({ tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'asset.maintenance.deleted', targetType: 'asset_maintenance', targetId: recordId, metadata: { assetId }, result: 'success', occurredAt: new Date() });
    return { ok: true };
  }
}
