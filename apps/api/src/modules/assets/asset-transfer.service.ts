import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { AssetLifecycleState } from '../../common/enums';
import { assertLifecycleTransition } from './asset-lifecycle';
import { toDto } from '../../common/mongoose.utils';

@Injectable()
export class AssetTransferService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async list(auth: AuthContext, status?: string) {
    const filter: any = { tenantId: auth.tenantId };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    if (status) filter.status = status;
    return (await this.db.assetTransfer.find(filter).sort({ requestedAt: -1 }).lean()).map((x: any) => toDto(x));
  }

  async get(auth: AuthContext, transferId: string) {
    const filter: any = { _id: transferId, tenantId: auth.tenantId };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    const transfer = await this.db.assetTransfer.findOne(filter).lean();
    if (!transfer) throw new NotFoundException('Transfer request not found');
    return toDto(transfer);
  }

  private async currentUserId(assetId: string) {
    const assignment = await this.db.assetAssignment.findOne({ assetId, returnedAt: { $exists: false } }).lean();
    return assignment?.userId;
  }

  private async audit(auth: AuthContext, action: string, targetId: string, metadata: Record<string, unknown>) {
    await this.db.auditEvent.create({ tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action, targetType: 'asset_transfer', targetId, metadata, result: 'success', occurredAt: new Date() });
  }

  private async validateDestination(auth: AuthContext, locationId?: string, departmentId?: string, session?: import('mongoose').ClientSession) {
    if (locationId) {
      const location = await this.db.location.findById(locationId).session(session ?? null).lean();
      if (!location) throw new NotFoundException('Destination location not found');
      const plant = await this.db.plant.findById(location.plantId).session(session ?? null).lean();
      const bu = plant ? await this.db.businessUnit.findById(plant.businessUnitId).session(session ?? null).lean() : null;

      let destinationAllowed = false;
      if (plant && bu) {
        if (auth.crossCompany) {
          const companyExists = await this.db.company.exists({ _id: bu.companyId, tenantId: auth.tenantId }).session(session ?? null);
          destinationAllowed = Boolean(companyExists);
        } else {
          destinationAllowed = String(bu.companyId) === String(auth.companyId);
        }
      }
      if (!destinationAllowed) throw new ForbiddenException('Destination location is outside your scope');

      if (departmentId) {
        const department = await this.db.department.findOne({ _id: departmentId, locationId }).session(session ?? null).lean();
        if (!department) throw new ForbiddenException('Destination department does not belong to the selected location');
      }
      return;
    }

    if (departmentId) {
      const department = await this.db.department.findById(departmentId).session(session ?? null).lean();
      if (!department) throw new NotFoundException('Destination department not found');
      const location = await this.db.location.findById(department.locationId).session(session ?? null).lean();
      const plant = location ? await this.db.plant.findById(location.plantId).session(session ?? null).lean() : null;
      const bu = plant ? await this.db.businessUnit.findById(plant.businessUnitId).session(session ?? null).lean() : null;

      let destinationAllowed = false;
      if (plant && bu) {
        if (auth.crossCompany) {
          const companyExists = await this.db.company.exists({ _id: bu.companyId, tenantId: auth.tenantId }).session(session ?? null);
          destinationAllowed = Boolean(companyExists);
        } else {
          destinationAllowed = String(bu.companyId) === String(auth.companyId);
        }
      }
      if (!destinationAllowed) throw new ForbiddenException('Destination department is outside your scope');
    }
  }

  private async validateTargetUser(auth: AuthContext, userId: string, session?: import('mongoose').ClientSession) {
    const filter: any = { _id: userId, tenantId: auth.tenantId, isActive: true };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    const user = await this.db.user.findOne(filter).session(session ?? null).lean();
    if (!user) throw new ForbiddenException('Destination user is not active or outside your scope');
    return user;
  }

  async request(auth: AuthContext, assetId: string, dto: { toUserId?: string; toLocationId?: string; toDepartmentId?: string; reason?: string; note?: string }) {
    const assetFilter: any = { _id: assetId, tenantId: auth.tenantId };
    if (!auth.crossCompany) assetFilter.companyId = auth.companyId;
    const asset = await this.db.asset.findOne(assetFilter).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    if (asset.status !== AssetLifecycleState.ASSIGNED) throw new ConflictException('Only assigned assets can be transferred');

    if (dto.toUserId) await this.validateTargetUser(auth, dto.toUserId);
    await this.validateDestination(auth, dto.toLocationId, dto.toDepartmentId);

    const currentUserId = await this.currentUserId(assetId);
    if (!dto.toUserId && !dto.toLocationId && !dto.toDepartmentId) throw new ConflictException('A destination user, location, or department is required');
    if (dto.toUserId && dto.toUserId === currentUserId) throw new ConflictException('Destination user is already the current assignee');

    const existing = await this.db.assetTransfer.findOne({ assetId, status: { $in: ['PENDING', 'APPROVED'] } }).lean();
    if (existing) throw new ConflictException('An active transfer request already exists for this asset');

    const created = await this.db.assetTransfer.create({
      tenantId: auth.tenantId,
      companyId: asset.companyId,
      assetId,
      fromUserId: currentUserId,
      toUserId: dto.toUserId,
      toLocationId: dto.toLocationId,
      toDepartmentId: dto.toDepartmentId,
      requestedByUserId: auth.userId,
      status: 'PENDING',
      requestedAt: new Date(),
      reason: dto.reason,
      approvalNote: dto.note,
    });

    await this.audit(auth, 'asset.transfer.requested', String(created._id), { assetId, toUserId: dto.toUserId, toLocationId: dto.toLocationId, toDepartmentId: dto.toDepartmentId });
    return toDto(created.toObject());
  }

  async approve(auth: AuthContext, transferId: string, note?: string) {
    const filter: any = { _id: transferId, tenantId: auth.tenantId, status: 'PENDING' };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    const transfer = await this.db.assetTransfer.findOneAndUpdate(filter, { $set: { status: 'APPROVED', approvedByUserId: auth.userId, approvedAt: new Date(), approvalNote: note?.trim() || undefined } }, { new: true }).lean();
    if (!transfer) throw new ConflictException('Transfer is no longer pending or is outside your scope');
    await this.audit(auth, 'asset.transfer.approved', String(transfer._id), { assetId: transfer.assetId });
    return toDto(transfer);
  }

  async reject(auth: AuthContext, transferId: string, note?: string) {
    const filter: any = { _id: transferId, tenantId: auth.tenantId, status: 'PENDING' };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    const transfer = await this.db.assetTransfer.findOneAndUpdate(filter, { $set: { status: 'REJECTED', approvalNote: note?.trim() || undefined } }, { new: true }).lean();
    if (!transfer) throw new ConflictException('Transfer is no longer pending or is outside your scope');
    await this.audit(auth, 'asset.transfer.rejected', String(transfer._id), { assetId: transfer.assetId });
    return toDto(transfer);
  }

  async cancel(auth: AuthContext, transferId: string, note?: string) {
    const filter: any = { _id: transferId, tenantId: auth.tenantId, status: { $in: ['PENDING', 'APPROVED'] } };
    if (!auth.crossCompany) filter.companyId = auth.companyId;
    const transfer = await this.db.assetTransfer.findOneAndUpdate(filter, { $set: { status: 'CANCELLED', cancelledByUserId: auth.userId, cancelledAt: new Date(), cancellationNote: note?.trim() || undefined } }, { new: true }).lean();
    if (!transfer) throw new ConflictException('Transfer cannot be cancelled from its current state or is outside your scope');
    await this.audit(auth, 'asset.transfer.cancelled', String(transfer._id), { assetId: transfer.assetId });
    return toDto(transfer);
  }

  async complete(auth: AuthContext, transferId: string, note?: string) {
    const session = await this.db.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const filter: any = { _id: transferId, tenantId: auth.tenantId, status: 'APPROVED' };
        if (!auth.crossCompany) filter.companyId = auth.companyId;
        const transfer = await this.db.assetTransfer.findOne(filter).session(session).lean();
        if (!transfer) throw new ConflictException('Transfer is not approved or is outside your scope');

        if (transfer.toUserId) await this.validateTargetUser(auth, transfer.toUserId, session);
        await this.validateDestination(auth, transfer.toLocationId, transfer.toDepartmentId, session);

        const assetFilter: any = { _id: transfer.assetId, tenantId: auth.tenantId, status: AssetLifecycleState.ASSIGNED };
        if (!auth.crossCompany) assetFilter.companyId = auth.companyId;
        const asset = await this.db.asset.findOne(assetFilter).session(session).lean();
        if (!asset) throw new ConflictException('Asset is not currently assigned or is outside your scope');

        assertLifecycleTransition(AssetLifecycleState.ASSIGNED, AssetLifecycleState.IN_STOCK);
        const current = await this.db.assetAssignment.findOne({ assetId: transfer.assetId, returnedAt: { $exists: false } }).session(session).lean();
        if (!current) throw new ConflictException('Asset assignment record is missing');

        await this.db.assetAssignment.findOneAndUpdate({ _id: current._id, returnedAt: { $exists: false } }, { $set: { returnedAt: new Date() } }, { new: true, session }).lean();
        await this.db.asset.findOneAndUpdate({ _id: transfer.assetId, tenantId: auth.tenantId, status: AssetLifecycleState.ASSIGNED }, { $set: { status: AssetLifecycleState.IN_STOCK, updatedAt: new Date(), ...(transfer.toLocationId ? { locationId: transfer.toLocationId } : {}), ...(transfer.toDepartmentId ? { departmentId: transfer.toDepartmentId } : {}) } }, { new: true, session }).lean();

        if (transfer.toUserId) {
          assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.ASSIGNED);
          await this.db.asset.findOneAndUpdate({ _id: transfer.assetId, tenantId: auth.tenantId, status: AssetLifecycleState.IN_STOCK }, { $set: { status: AssetLifecycleState.ASSIGNED, updatedAt: new Date() } }, { new: true, session }).lean();
          await this.db.assetAssignment.create([{ assetId: transfer.assetId, userId: transfer.toUserId, assignedAt: new Date(), notes: note?.trim() || 'Transfer completed' }], { session });
        }

        const updated = await this.db.assetTransfer.findOneAndUpdate({ _id: transfer._id, status: 'APPROVED' }, { $set: { status: 'COMPLETED', completedByUserId: auth.userId, completedAt: new Date(), completionNote: note?.trim() || undefined } }, { new: true, session }).lean();
        if (!updated) throw new ConflictException('Transfer changed before completion');
        result = updated;

        await this.db.assetAuditEvent.create([{
          tenantId: auth.tenantId,
          companyId: auth.companyId,
          assetId: transfer.assetId,
          fromState: AssetLifecycleState.ASSIGNED,
          toState: transfer.toUserId ? AssetLifecycleState.ASSIGNED : AssetLifecycleState.IN_STOCK,
          actorUserId: auth.userId,
          reason: note?.trim() || 'Asset transfer completed',
          occurredAt: new Date(),
        }], { session });
      });

      await this.audit(auth, 'asset.transfer.completed', String(result._id), { assetId: result.assetId });
      return toDto(result);
    } finally {
      await session.endSession();
    }
  }
}
