import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto } from '../../common/mongoose.utils';

@Injectable()
export class UserAsset360Service extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  private async scopedUser(auth: AuthContext, userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
    if (!user) throw new NotFoundException('User not found');
    return { id: String(user._id), employeeId: user.employeeId, email: user.email, firstName: user.firstName, lastName: user.lastName, jobTitle: user.jobTitle, phone: user.phone, companyId: user.companyId, departmentId: user.departmentId, locationId: user.locationId, isActive: user.isActive, forcePasswordReset: user.forcePasswordReset, roleIds: user.roleIds ?? [] };
  }

  private async assignedData(auth: AuthContext, userId: string) {
    const assignments = await this.db.assetAssignment.find({ userId }).sort({ assignedAt: -1 }).lean();
    if (!assignments.length) return { assets: [], assignments, typeById: new Map<string, any>() };
    const assetIds = [...new Set(assignments.map((assignment: any) => String(assignment.assetId)).filter(Boolean))];
    const assets = await this.db.asset.find({ ...this.scope(auth), _id: { $in: assetIds } }).select({ _id: 1, assetNumber: 1, status: 1, assetTypeId: 1, locationId: 1, departmentId: 1 }).lean();
    const typeIds = [...new Set(assets.map((asset: any) => String(asset.assetTypeId)).filter(Boolean))];
    const types = typeIds.length ? await this.db.assetType.find({ _id: { $in: typeIds }, companyId: auth.companyId }).select({ _id: 1, name: 1 }).lean() : [];
    return { assets, assignments, typeById: new Map(types.map((type: any) => [String(type._id), type])) };
  }

  async overview(auth: AuthContext, userId: string) {
    const user = await this.scopedUser(auth, userId);
    const { assets, assignments, typeById } = await this.assignedData(auth, userId);
    const assetById = new Map(assets.map((asset: any) => [String(asset._id), asset]));
    const currentRows = assignments.filter((assignment: any) => !assignment.returnedAt).map((assignment: any) => {
      const asset = assetById.get(String(assignment.assetId));
      return asset ? { assignment: toDto(assignment), asset: { ...toDto(asset), assetType: typeById.get(String(asset.assetTypeId)) ? { name: typeById.get(String(asset.assetTypeId)).name } : undefined } } : null;
    }).filter(Boolean);
    const counts: Record<string, number> = {};
    for (const row of currentRows as any[]) {
      const name = row.asset.assetType?.name ?? 'Other';
      counts[name] = (counts[name] ?? 0) + 1;
    }
    const assetIds = assets.map((asset: any) => String(asset._id));
    const transfers = assetIds.length ? await this.db.assetTransfer.find({ tenantId: auth.tenantId, companyId: auth.companyId, assetId: { $in: assetIds }, $or: [{ fromUserId: userId }, { toUserId: userId }] }).sort({ requestedAt: -1 }).limit(50).lean() : [];
    const activity = [
      ...assignments.map((assignment: any) => ({ type: assignment.returnedAt ? 'RETURN' : 'ASSIGNMENT', timestamp: assignment.returnedAt ?? assignment.assignedAt, assetId: assignment.assetId, title: assignment.returnedAt ? 'Asset returned' : 'Asset assigned' })),
      ...transfers.map((transfer: any) => ({ type: 'TRANSFER', timestamp: transfer.completedAt ?? transfer.requestedAt, assetId: transfer.assetId, title: `Transfer ${String(transfer.status).toLowerCase()}`, status: transfer.status })),
    ].sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()).slice(0, 100);
    return {
      user,
      assetSummary: { currentCount: currentRows.length, typeCounts: counts },
      currentAssets: currentRows,
      history: assignments.map((assignment: any) => {
        const asset = assetById.get(String(assignment.assetId));
        return asset ? { assignment: toDto(assignment), asset: { ...toDto(asset), assetType: typeById.get(String(asset.assetTypeId)) ? { name: typeById.get(String(asset.assetTypeId)).name } : undefined } } : null;
      }).filter(Boolean),
      transfers: transfers.map((transfer: any) => toDto(transfer)),
      activity,
    };
  }
}
