import { Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto } from '../../common/mongoose.utils';

@Injectable()
export class AssetDetailService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  async get(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found');
    const assetTypeFilter: Record<string, unknown> = { _id: asset.assetTypeId };
    if (!auth.crossCompany) assetTypeFilter.companyId = auth.companyId;
    const [assetType, assignment] = await Promise.all([
      this.db.assetType.findOne(assetTypeFilter).select({ _id: 1, name: 1 }).lean(),
      this.db.assetAssignment.findOne({ assetId: String(asset._id), returnedAt: { $exists: false } }).lean(),
    ]);
    let user: any = null;
    if (assignment?.userId) {
      const userFilter: Record<string, unknown> = { _id: assignment.userId, tenantId: auth.tenantId, accountType: 'TENANT' };
      if (!auth.crossCompany) userFilter.companyId = auth.companyId;
      user = await this.db.user.findOne(userFilter).select({ _id: 1, employeeId: 1, firstName: 1, lastName: 1, email: 1, jobTitle: 1 }).lean();
    }
    return {
      ...toDto(asset),
      assetType: assetType ? toDto(assetType) : undefined,
      assignment: assignment ? { ...toDto(assignment), user: user ? toDto(user) : null } : null,
    };
  }
}
