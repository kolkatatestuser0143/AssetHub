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
    const [assetType, assignment] = await Promise.all([
      this.db.assetType.findOne({ _id: asset.assetTypeId, companyId: auth.companyId }).select({ _id: 1, name: 1 }).lean(),
      this.db.assetAssignment.findOne({ assetId: String(asset._id), returnedAt: { $exists: false } }).lean(),
    ]);
    let user: any = null;
    if (assignment?.userId) {
      user = await this.db.user.findOne({ _id: assignment.userId, tenantId: auth.tenantId, companyId: auth.companyId, accountType: 'TENANT' }).select({ _id: 1, employeeId: 1, firstName: 1, lastName: 1, email: 1, jobTitle: 1 }).lean();
    }
    return {
      ...toDto(asset),
      assetType: assetType ? toDto(assetType) : undefined,
      assignment: assignment ? { ...toDto(assignment), user: user ? toDto(user) : null } : null,
    };
  }
}
