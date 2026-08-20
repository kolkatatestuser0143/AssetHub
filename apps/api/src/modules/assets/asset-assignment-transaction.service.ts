import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { AssetCondition, AssetLifecycleState } from '../../common/enums';
import { assertLifecycleTransition } from './asset-lifecycle';

@Injectable()
export class AssetAssignmentTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(auth: AuthContext, assetId: string, userId: string, notes?: string) {
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, async (tx) => {
      const asset = await tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } });
      if (!asset) throw new NotFoundException('Asset not found in your scope');
      if (asset.status !== AssetLifecycleState.IN_STOCK) throw new ConflictException(`Asset cannot be assigned while in ${asset.status} state`);
      if (asset.condition === AssetCondition.DAMAGED || asset.condition === AssetCondition.NEEDS_INSPECTION) throw new ConflictException('Damaged or inspection-required assets cannot be assigned');

      const user = await tx.user.findFirst({ where: { id: userId, tenantId: auth.tenantId, companyId: auth.companyId } });
      if (!user) throw new NotFoundException('User not found in your company');
      if (!user.isActive) throw new ForbiddenException('Cannot assign an asset to an inactive user');

      const active = await tx.assetAssignment.findFirst({ where: { assetId, returnedAt: null } });
      if (active) throw new ConflictException('Asset is already assigned');
      assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.ASSIGNED);

      const transitioned = await tx.asset.updateMany({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId, status: AssetLifecycleState.IN_STOCK }, data: { status: AssetLifecycleState.ASSIGNED } });
      if (transitioned.count !== 1) throw new ConflictException('Asset changed before assignment; retry');

      const created = await tx.assetAssignment.create({ data: { assetId, userId, assignedAt: new Date(), notes } });
      await tx.assetAuditEvent.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId, fromState: AssetLifecycleState.IN_STOCK, toState: AssetLifecycleState.ASSIGNED, actorUserId: auth.userId, reason: notes?.trim() || 'Asset assigned', occurredAt: new Date() } });
      return created;
    });
    return result;
  }

  async unassign(auth: AuthContext, assetId: string, notes?: string, conditionAtReturn?: AssetCondition) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, async (tx) => {
      const asset = await tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } });
      if (!asset) throw new NotFoundException('Asset not found in your scope');
      if (asset.status !== AssetLifecycleState.ASSIGNED) throw new ConflictException(`Asset cannot be returned while in ${asset.status} state`);

      const assignment = await tx.assetAssignment.findFirst({ where: { assetId, returnedAt: null } });
      if (!assignment) throw new NotFoundException('Asset is not currently assigned');
      assertLifecycleTransition(AssetLifecycleState.ASSIGNED, AssetLifecycleState.IN_STOCK);

      const closed = await tx.assetAssignment.updateMany({ where: { id: assignment.id, returnedAt: null }, data: { returnedAt: new Date(), ...(notes !== undefined ? { notes } : {}), ...(conditionAtReturn !== undefined ? { conditionAtReturn } : {}) } });
      if (closed.count !== 1) throw new ConflictException('Assignment changed before return; retry');

      const nextCondition = conditionAtReturn ?? asset.condition ?? AssetCondition.GOOD;
      const transitioned = await tx.asset.updateMany({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId, status: AssetLifecycleState.ASSIGNED }, data: { status: AssetLifecycleState.IN_STOCK, condition: nextCondition } });
      if (transitioned.count !== 1) throw new ConflictException('Asset changed before return; retry');

      await tx.assetAuditEvent.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId, fromState: AssetLifecycleState.ASSIGNED, toState: AssetLifecycleState.IN_STOCK, actorUserId: auth.userId, reason: notes?.trim() || `Asset returned${conditionAtReturn ? ` · condition ${conditionAtReturn}` : ''}`, occurredAt: new Date() } });
      return tx.assetAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    });
  }
}
