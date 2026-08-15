import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

type TransferStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

@Injectable()
export class AssetTransferService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  async list(auth: AuthContext, status?: TransferStatus) {
    const filter: Record<string, unknown> = { tenantId: auth.tenantId };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    if (status) filter.status = status;
    return toDtoArray(await this.db.assetTransfer.find(filter).sort({ requestedAt: -1 }).lean());
  }

  async get(auth: AuthContext, transferId: string) {
    const transfer = await this.db.assetTransfer.findOne({ _id: transferId, ...this.scope(auth) }).lean();
    if (!transfer) throw new NotFoundException('Transfer request not found');
    return toDto(transfer);
  }

  async request(auth: AuthContext, assetId: string, input: { toUserId?: string; toLocationId?: string; toDepartmentId?: string; reason?: string }) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    if (!input.toUserId && !input.toLocationId && !input.toDepartmentId) throw new ForbiddenException('Transfer destination is required');

    const existing = await this.db.assetTransfer.findOne({ assetId, status: { $in: ['PENDING', 'APPROVED'] } }).lean();
    if (existing) throw new ConflictException('Asset already has an active transfer request');

    if (input.toUserId) {
      const user = await this.db.user.findOne({ _id: input.toUserId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }).lean();
      if (!user) throw new ForbiddenException('Destination user is outside your scope');
      if (!user.isActive) throw new ForbiddenException('Destination user is inactive');
    }

    if (input.toLocationId || input.toDepartmentId) {
      await this.validateDestination(auth, input.toLocationId, input.toDepartmentId);
    }

    const doc = await this.db.assetTransfer.create({
      tenantId: auth.tenantId,
      companyId: asset.companyId,
      assetId,
      fromUserId: await this.currentUserId(assetId),
      fromLocationId: asset.locationId,
      fromDepartmentId: asset.departmentId,
      toUserId: input.toUserId,
      toLocationId: input.toLocationId,
      toDepartmentId: input.toDepartmentId,
      requestedByUserId: auth.userId,
      requestedAt: new Date(),
      status: 'PENDING',
      reason: input.reason?.trim() || undefined,
    });
    return toDto(doc.toObject());
  }

  async approve(auth: AuthContext, transferId: string, note?: string) {
    const transfer = await this.requireTransfer(auth, transferId);
    if (transfer.status !== 'PENDING') throw new ConflictException('Only pending transfers can be approved');
    const updated = await this.db.assetTransfer.findOneAndUpdate(
      { _id: transferId, tenantId: auth.tenantId, status: 'PENDING' },
      { $set: { status: 'APPROVED', approvedByUserId: auth.userId, approvedAt: new Date(), approvalNote: note?.trim() || undefined } },
      { new: true },
    ).lean();
    if (!updated) throw new ConflictException('Transfer changed before approval');
    return toDto(updated);
  }

  async reject(auth: AuthContext, transferId: string, note?: string) {
    const transfer = await this.requireTransfer(auth, transferId);
    if (transfer.status !== 'PENDING') throw new ConflictException('Only pending transfers can be rejected');
    const updated = await this.db.assetTransfer.findOneAndUpdate(
      { _id: transferId, tenantId: auth.tenantId, status: 'PENDING' },
      { $set: { status: 'REJECTED', approvedByUserId: auth.userId, approvedAt: new Date(), approvalNote: note?.trim() || undefined } },
      { new: true },
    ).lean();
    if (!updated) throw new ConflictException('Transfer changed before rejection');
    return toDto(updated);
  }

  async complete(auth: AuthContext, transferId: string, note?: string) {
    const transfer = await this.requireTransfer(auth, transferId);
    if (transfer.status !== 'APPROVED') throw new ConflictException('Only approved transfers can be completed');

    const asset = await this.db.asset.findOne({ _id: transfer.assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset no longer exists in your scope');

    if (transfer.toUserId) {
      const user = await this.db.user.findOne({ _id: transfer.toUserId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }).lean();
      if (!user || !user.isActive) throw new ForbiddenException('Destination user is no longer valid');
    }
    if (transfer.toLocationId || transfer.toDepartmentId) await this.validateDestination(auth, transfer.toLocationId, transfer.toDepartmentId);

    const existingAssignment = await this.db.assetAssignment.findOne({ assetId: transfer.assetId, returnedAt: { $exists: false } }).lean();
    if (existingAssignment) {
      await this.db.assetAssignment.findOneAndUpdate({ _id: existingAssignment._id, returnedAt: { $exists: false } }, { $set: { returnedAt: new Date(), notes: `Transferred via request ${transferId}` } });
    }

    const updatedAsset = await this.db.asset.findOneAndUpdate(
      { _id: transfer.assetId, ...this.scope(auth) },
      { $set: { locationId: transfer.toLocationId, departmentId: transfer.toDepartmentId } },
      { new: true },
    ).lean();
    if (!updatedAsset) throw new ConflictException('Asset changed before transfer completion');

    if (transfer.toUserId) {
      await this.db.assetAssignment.create({ assetId: transfer.assetId, userId: transfer.toUserId, assignedAt: new Date(), notes: `Transferred via request ${transferId}` });
    }

    const result = await this.db.assetTransfer.findOneAndUpdate(
      { _id: transferId, tenantId: auth.tenantId, status: 'APPROVED' },
      { $set: { status: 'COMPLETED', completedByUserId: auth.userId, completedAt: new Date(), completionNote: note?.trim() || undefined } },
      { new: true },
    ).lean();
    if (!result) throw new ConflictException('Transfer changed before completion');
    return toDto(result);
  }

  async cancel(auth: AuthContext, transferId: string, note?: string) {
    const transfer = await this.requireTransfer(auth, transferId);
    if (!['PENDING', 'APPROVED'].includes(transfer.status)) throw new ConflictException('Transfer cannot be cancelled in its current state');
    const updated = await this.db.assetTransfer.findOneAndUpdate(
      { _id: transferId, tenantId: auth.tenantId, status: { $in: ['PENDING', 'APPROVED'] } },
      { $set: { status: 'CANCELLED', cancelledByUserId: auth.userId, cancelledAt: new Date(), cancellationNote: note?.trim() || undefined } },
      { new: true },
    ).lean();
    if (!updated) throw new ConflictException('Transfer changed before cancellation');
    return toDto(updated);
  }

  private async requireTransfer(auth: AuthContext, transferId: string) {
    const transfer = await this.db.assetTransfer.findOne({ _id: transferId, ...this.scope(auth) }).lean();
    if (!transfer) throw new NotFoundException('Transfer request not found');
    return transfer;
  }

  private async currentUserId(assetId: string) {
    const assignment = await this.db.assetAssignment.findOne({ assetId, returnedAt: { $exists: false } }).lean();
    return assignment?.userId;
  }

  private async validateDestination(auth: AuthContext, locationId?: string, departmentId?: string) {
    if (locationId) {
      const location = await this.db.location.findById(locationId).lean();
      if (!location) throw new NotFoundException('Destination location not found');
      const plant = await this.db.plant.findById(location.plantId).lean();
      const bu = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
      if (!plant || !bu || (auth.crossCompany ? !((await this.db.company.exists({ _id: bu.companyId, tenantId: auth.tenantId }))) : String(bu.companyId) !== auth.companyId)) {
        throw new ForbiddenException('Destination location is outside your scope');
      }
      if (departmentId) {
        const department = await this.db.department.findOne({ _id: departmentId, locationId }).lean();
        if (!department) throw new ForbiddenException('Destination department does not belong to the selected location');
      }
      return;
    }
    if (departmentId) {
      const department = await this.db.department.findById(departmentId).lean();
      if (!department) throw new NotFoundException('Destination department not found');
      const location = await this.db.location.findById(department.locationId).lean();
      const plant = location ? await this.db.plant.findById(location.plantId).lean() : null;
      const bu = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
      if (!location || !plant || !bu || (auth.crossCompany ? !(await this.db.company.exists({ _id: bu.companyId, tenantId: auth.tenantId })) : String(bu.companyId) !== auth.companyId)) {
        throw new ForbiddenException('Destination department is outside your scope');
      }
    }
  }
}
