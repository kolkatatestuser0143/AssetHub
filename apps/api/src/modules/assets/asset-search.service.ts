import { Injectable } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

@Injectable()
export class AssetSearchService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async search(auth: AuthContext, query: string) {
    const normalized = query.trim();
    if (!normalized) return [];

    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const matchingTypes = await this.db.assetType
      .find({ companyId: auth.companyId, name: regex })
      .select({ _id: 1, name: 1 })
      .limit(20)
      .lean();

    const typeIds = matchingTypes.map((type: any) => type._id);
    const assets = await this.db.asset
      .find({
        tenantId: auth.tenantId,
        companyId: auth.companyId,
        $or: [
          { assetNumber: regex },
          { status: regex },
          ...(typeIds.length ? [{ assetTypeId: { $in: typeIds } }] : []),
        ],
      })
      .select({ _id: 1, assetNumber: 1, status: 1, assetTypeId: 1 })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const typeNames = new Map(matchingTypes.map((type: any) => [String(type._id), type.name]));
    return assets.map((asset: any) => ({
      id: String(asset._id),
      assetNumber: asset.assetNumber,
      status: asset.status,
      assetType: {
        id: String(asset.assetTypeId),
        name: typeNames.get(String(asset.assetTypeId)) ?? 'Asset',
      },
    }));
  }
}
