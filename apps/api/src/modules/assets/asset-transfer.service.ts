import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { AssetLifecycleState } from '../../common/enums';
import { assertLifecycleTransition } from './asset-lifecycle';

@Injectable()
export class AssetTransferService {
  constructor(private readonly prisma: PrismaService) {}

  private async destination(auth: AuthContext, locationId?: string, departmentId?: string) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, async tx => {
      if (locationId) {
        const location = await tx.location.findFirst({ where: { id: locationId, site: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } } });
        if (!location) throw new NotFoundException('Destination location not found');
        if (departmentId) {
          const department = await tx.department.findFirst({ where: { id: departmentId, locationId } });
          if (!department) throw new ForbiddenException('Destination department does not belong to the selected location');
        }
        return;
      }
      if (departmentId) {
        const department = await tx.department.findFirst({ where: { id: departmentId, location: { site: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } } } });
        if (!department) throw new NotFoundException('Destination department not found');
      }
    });
  }

  private async targetUser(auth: AuthContext, userId: string) {
    const user = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.user.findFirst({ where: { id: userId, tenantId: auth.tenantId, isActive: true, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } }));
    if (!user) throw new ForbiddenException('Destination user is not active or outside your scope');
    return user;
  }

  private async audit(auth: AuthContext, assetId: string, fromState: string, toState: string, reason: string) {
    await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAuditEvent.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId, fromState, toState, actorUserId: auth.userId, reason, occurredAt: new Date() } }));
  }

  async list(auth: AuthContext, status?: string) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.findMany({ where: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }), ...(status ? { status } : {}) }, orderBy: { requestedAt: 'desc' } }));
  }

  async get(auth: AuthContext, transferId: string) {
    const transfer = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.findFirst({ where: { id: transferId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } }));
    if (!transfer) throw new NotFoundException('Transfer request not found');
    return transfer;
  }

  async request(auth: AuthContext, assetId: string, dto: { toUserId?: string; toLocationId?: string; toDepartmentId?: string; reason?: string; note?: string }) {
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } }));
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    if (asset.status !== AssetLifecycleState.ASSIGNED) throw new ConflictException('Only assigned assets can be transferred');
    if (!dto.toUserId && !dto.toLocationId && !dto.toDepartmentId) throw new ConflictException('A destination user, location, or department is required');
    if (dto.toUserId) await this.targetUser(auth, dto.toUserId);
    await this.destination(auth, dto.toLocationId, dto.toDepartmentId);

    const current = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAssignment.findFirst({ where: { assetId, returnedAt: null } }));
    if (dto.toUserId && dto.toUserId === current?.userId) throw new ConflictException('Destination user is already the current assignee');
    const existing = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.findFirst({ where: { assetId, status: { in: ['PENDING', 'APPROVED'] } } }));
    if (existing) throw new ConflictException('An active transfer request already exists for this asset');

    const created = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.create({ data: { tenantId: auth.tenantId, companyId: asset.companyId, assetId, fromUserId: current?.userId ?? null, toUserId: dto.toUserId ?? null, toLocationId: dto.toLocationId ?? null, toDepartmentId: dto.toDepartmentId ?? null, requestedByUserId: auth.userId, status: 'PENDING', requestedAt: new Date(), reason: dto.reason, approvalNote: dto.note } }));
    await this.audit(auth, assetId, AssetLifecycleState.ASSIGNED, AssetLifecycleState.ASSIGNED, 'Asset transfer requested');
    return created;
  }

  async approve(auth: AuthContext, transferId: string, note?: string) {
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.updateMany({ where: { id: transferId, tenantId: auth.tenantId, status: 'PENDING', ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }, data: { status: 'APPROVED', approvedByUserId: auth.userId, approvedAt: new Date(), approvalNote: note?.trim() || null } }));
    if (!result.count) throw new ConflictException('Transfer is no longer pending or is outside your scope');
    return this.get(auth, transferId);
  }

  async reject(auth: AuthContext, transferId: string, note?: string) {
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.updateMany({ where: { id: transferId, tenantId: auth.tenantId, status: 'PENDING', ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }, data: { status: 'REJECTED', approvalNote: note?.trim() || null } }));
    if (!result.count) throw new ConflictException('Transfer is no longer pending or is outside your scope');
    return this.get(auth, transferId);
  }

  async cancel(auth: AuthContext, transferId: string, note?: string) {
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetTransfer.updateMany({ where: { id: transferId, tenantId: auth.tenantId, status: { in: ['PENDING', 'APPROVED'] }, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }, data: { status: 'CANCELLED', cancelledByUserId: auth.userId, cancelledAt: new Date(), cancellationNote: note?.trim() || null } }));
    if (!result.count) throw new ConflictException('Transfer cannot be cancelled from its current state or is outside your scope');
    return this.get(auth, transferId);
  }

  async complete(auth: AuthContext, transferId: string, note?: string) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, async tx => {
      const transfer = await tx.assetTransfer.findFirst({ where: { id: transferId, tenantId: auth.tenantId, status: 'APPROVED', ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } });
      if (!transfer) throw new ConflictException('Transfer is not approved or is outside your scope');
      if (transfer.toUserId) {
        const user = await tx.user.findFirst({ where: { id: transfer.toUserId, tenantId: auth.tenantId, isActive: true, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } });
        if (!user) throw new ForbiddenException('Destination user is not active or outside your scope');
      }
      if (transfer.toLocationId) {
        const location = await tx.location.findFirst({ where: { id: transfer.toLocationId, site: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } } });
        if (!location) throw new NotFoundException('Destination location not found');
      }
      const asset = await tx.asset.findFirst({ where: { id: transfer.assetId, tenantId: auth.tenantId, status: AssetLifecycleState.ASSIGNED, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } });
      if (!asset) throw new ConflictException('Asset is not currently assigned or is outside your scope');
      const current = await tx.assetAssignment.findFirst({ where: { assetId: transfer.assetId, returnedAt: null } });
      if (!current) throw new ConflictException('Asset assignment record is missing');
      assertLifecycleTransition(AssetLifecycleState.ASSIGNED, AssetLifecycleState.IN_STOCK);
      await tx.assetAssignment.updateMany({ where: { id: current.id, returnedAt: null }, data: { returnedAt: new Date() } });
      await tx.asset.updateMany({ where: { id: asset.id, status: AssetLifecycleState.ASSIGNED }, data: { status: AssetLifecycleState.IN_STOCK, ...(transfer.toLocationId ? { locationId: transfer.toLocationId } : {}), ...(transfer.toDepartmentId ? { departmentId: transfer.toDepartmentId } : {}) } });
      if (transfer.toUserId) {
        assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.ASSIGNED);
        await tx.asset.updateMany({ where: { id: asset.id, status: AssetLifecycleState.IN_STOCK }, data: { status: AssetLifecycleState.ASSIGNED } });
        await tx.assetAssignment.create({ data: { assetId: asset.id, userId: transfer.toUserId, assignedAt: new Date(), notes: note?.trim() || 'Transfer completed' } });
      }
      const updated = await tx.assetTransfer.updateMany({ where: { id: transfer.id, status: 'APPROVED' }, data: { status: 'COMPLETED', completedByUserId: auth.userId, completedAt: new Date(), completionNote: note?.trim() || null } });
      if (!updated.count) throw new ConflictException('Transfer changed before completion');
      await tx.assetAuditEvent.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId: asset.id, fromState: AssetLifecycleState.ASSIGNED, toState: transfer.toUserId ? AssetLifecycleState.ASSIGNED : AssetLifecycleState.IN_STOCK, actorUserId: auth.userId, reason: note?.trim() || 'Asset transfer completed', occurredAt: new Date() } });
      return tx.assetTransfer.findUniqueOrThrow({ where: { id: transfer.id } });
    });
  }
}
