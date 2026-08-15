import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { AssetLifecycleState } from '../../common/enums';
import { toDto } from '../../common/mongoose.utils';
import { assertLifecycleTransition } from './asset-lifecycle';

@Injectable()
export class AssetAssignmentTransactionService extends TenantScopedRepository {
  constructor(
    private readonly db: MongooseDatabaseService,
    @InjectConnection() private readonly connection: Connection,
  ) { super(); }

  async assign(auth: AuthContext, assetId: string, userId: string, notes?: string) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).session(session).lean();
        if (!asset) throw new NotFoundException('Asset not found in your scope');
        if (asset.status !== AssetLifecycleState.IN_STOCK) {
          throw new ConflictException(`Asset cannot be assigned while in ${asset.status} state`);
        }

        const user = await this.db.user.findOne({
          _id: userId,
          tenantId: auth.tenantId,
          companyId: auth.companyId,
        }).session(session).lean();
        if (!user) throw new NotFoundException('User not found in your company');
        if (!user.isActive) throw new ForbiddenException('Cannot assign an asset to an inactive user');

        const active = await this.db.assetAssignment.findOne({
          assetId,
          returnedAt: { $exists: false },
        }).session(session).lean();
        if (active) throw new ConflictException('Asset is already assigned');

        assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.ASSIGNED);

        const transitioned = await this.db.asset.findOneAndUpdate(
          { _id: assetId, ...this.scope(auth), status: AssetLifecycleState.IN_STOCK },
          { $set: { status: AssetLifecycleState.ASSIGNED, updatedAt: new Date() } },
          { new: true, session },
        ).lean();
        if (!transitioned) throw new ConflictException('Asset changed before assignment; retry');

        try {
          const created = await this.db.assetAssignment.create(
            [{ assetId, userId, assignedAt: new Date(), notes }],
            { session },
          );
          result = created[0];
        } catch (error: any) {
          if (error?.code === 11000) throw new ConflictException('Asset is already assigned');
          throw error;
        }

        await this.db.assetAuditEvent.create([{
          tenantId: auth.tenantId,
          companyId: auth.companyId,
          assetId,
          fromState: AssetLifecycleState.IN_STOCK,
          toState: AssetLifecycleState.ASSIGNED,
          actorUserId: auth.userId,
          reason: notes?.trim() || 'Asset assigned',
          occurredAt: new Date(),
        }], { session });
      });

      return toDto(result);
    } finally {
      await session.endSession();
    }
  }

  async unassign(auth: AuthContext, assetId: string, notes?: string) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).session(session).lean();
        if (!asset) throw new NotFoundException('Asset not found in your scope');
        if (asset.status !== AssetLifecycleState.ASSIGNED) {
          throw new ConflictException(`Asset cannot be returned while in ${asset.status} state`);
        }

        const assignment = await this.db.assetAssignment.findOne({
          assetId,
          returnedAt: { $exists: false },
        }).session(session).lean();
        if (!assignment) throw new NotFoundException('Asset is not currently assigned');

        assertLifecycleTransition(AssetLifecycleState.ASSIGNED, AssetLifecycleState.IN_STOCK);

        const closed = await this.db.assetAssignment.findOneAndUpdate(
          { _id: assignment._id, returnedAt: { $exists: false } },
          { $set: { returnedAt: new Date(), ...(notes ? { notes } : {}) } },
          { new: true, session },
        ).lean();
        if (!closed) throw new ConflictException('Assignment changed before return; retry');

        const transitioned = await this.db.asset.findOneAndUpdate(
          { _id: assetId, ...this.scope(auth), status: AssetLifecycleState.ASSIGNED },
          { $set: { status: AssetLifecycleState.IN_STOCK, updatedAt: new Date() } },
          { new: true, session },
        ).lean();
        if (!transitioned) throw new ConflictException('Asset changed before return; retry');

        await this.db.assetAuditEvent.create([{
          tenantId: auth.tenantId,
          companyId: auth.companyId,
          assetId,
          fromState: AssetLifecycleState.ASSIGNED,
          toState: AssetLifecycleState.IN_STOCK,
          actorUserId: auth.userId,
          reason: notes?.trim() || 'Asset returned',
          occurredAt: new Date(),
        }], { session });

        result = closed;
      });

      return toDto(result);
    } finally {
      await session.endSession();
    }
  }
}
