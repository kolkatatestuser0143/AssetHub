import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto } from '../../common/mongoose.utils';

@Injectable()
export class WarrantyService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  async get(auth: AuthContext, assetId: string) {
    await this.requireAsset(auth, assetId);
    const warranty = await this.db.warranty.findOne({ assetId, companyId: auth.companyId }).lean();
    return warranty ? toDto(warranty) : null;
  }

  async upsert(auth: AuthContext, assetId: string, provider?: string, expiresAt?: Date) {
    await this.requireAsset(auth, assetId);
    try {
      const warranty = await this.db.warranty.findOneAndUpdate(
        { assetId, companyId: auth.companyId },
        { $set: { companyId: auth.companyId, assetId, provider, expiresAt } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      return toDto(warranty);
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Warranty already exists for this asset');
      throw error;
    }
  }

  async remove(auth: AuthContext, assetId: string) {
    await this.requireAsset(auth, assetId);
    const result = await this.db.warranty.deleteOne({ assetId, companyId: auth.companyId });
    if (result.deletedCount === 0) throw new NotFoundException('Warranty not found');
    return { ok: true };
  }

  private async requireAsset(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }
}
