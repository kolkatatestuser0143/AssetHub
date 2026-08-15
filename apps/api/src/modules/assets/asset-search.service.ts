import { Injectable } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto } from '../../common/mongoose.utils';

const MAX_PAGE_SIZE = 100;

@Injectable()
export class AssetSearchService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  async list(auth: AuthContext, options: { q?: string; status?: string; assetTypeId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(options.pageSize) || 25));
    const q = (options.q ?? '').trim();
    const filter: Record<string, unknown> = this.scope(auth);
    if (options.status && options.status !== 'ALL') filter.status = options.status;
    if (options.assetTypeId) filter.assetTypeId = options.assetTypeId;

    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const or: Record<string, unknown>[] = [{ assetNumber: regex }, { status: regex }];
      const matchingTypes = await this.db.assetType.find({ companyId: auth.companyId, name: regex }).select({ _id: 1, name: 1 }).limit(20).lean();
      if (matchingTypes.length) or.push({ assetTypeId: { $in: matchingTypes.map((type: any) => type._id) } });
      filter.$or = or;
    }

    const [total, rows] = await Promise.all([
      this.db.asset.countDocuments(filter),
      this.db.asset.find(filter).select({ _id: 1, assetNumber: 1, status: 1, assetTypeId: 1, createdAt: 1 }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    ]);

    const typeIds = [...new Set(rows.map((row: any) => String(row.assetTypeId)).filter(Boolean))];
    const types = typeIds.length ? await this.db.assetType.find({ _id: { $in: typeIds }, companyId: auth.companyId }).select({ _id: 1, name: 1 }).lean() : [];
    const typeById = new Map(types.map((type: any) => [String(type._id), type.name]));

    return {
      items: rows.map((asset: any) => ({ ...toDto(asset), assetType: { id: String(asset.assetTypeId), name: typeById.get(String(asset.assetTypeId)) ?? 'Asset' } })),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async search(auth: AuthContext, query: string) {
    const result = await this.list(auth, { q: query, page: 1, pageSize: 8 });
    return result.items;
  }
}
