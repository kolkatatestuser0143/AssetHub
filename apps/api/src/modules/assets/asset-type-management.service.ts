import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { toDto } from '../../common/mongoose.utils';

@Injectable()
export class AssetTypeManagementService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async update(auth: AuthContext, assetTypeId: string, name: string, prefix: string, separator = '-', padding = 6) {
    const existing = await this.db.assetType.findOne({ _id: assetTypeId, companyId: auth.companyId }).lean();
    if (!existing) throw new NotFoundException('Asset type not found');
    const normalizedName = name.trim();
    const normalizedPrefix = prefix.trim().toUpperCase();
    if (!normalizedName) throw new ConflictException('Asset type name is required');
    const duplicateFilter: Record<string, unknown> = { companyId: auth.companyId, _id: { $ne: assetTypeId } };
    duplicateFilter.$or = normalizedPrefix ? [{ name: normalizedName }, { 'numberingRule.prefix': normalizedPrefix }] : [{ name: normalizedName }];
    const duplicate = await this.db.assetType.findOne(duplicateFilter).lean();
    if (duplicate) throw new ConflictException(normalizedPrefix ? 'Another asset type already uses this name or prefix' : 'Another asset type already uses this name');
    const updated = await this.db.assetType.findOneAndUpdate(
      { _id: assetTypeId, companyId: auth.companyId },
      { $set: { name: normalizedName, 'numberingRule.prefix': normalizedPrefix, 'numberingRule.separator': separator || '-', 'numberingRule.padding': Math.max(1, Number(padding) || 6), updatedAt: new Date() } },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Asset type not found');
    return toDto(updated);
  }
}
