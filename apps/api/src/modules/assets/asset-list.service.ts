import { Injectable } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto } from '../../common/mongoose.utils';

const MAX_PAGE_SIZE = 100;
const SORT_FIELDS = new Set(['assetNumber', 'status', 'createdAt']);

@Injectable()
export class AssetListService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  async list(auth: AuthContext, options: {
    q?: string;
    status?: string;
    assetTypeId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(options.pageSize) || 25));
    const sortBy = SORT_FIELDS.has(options.sortBy ?? '') ? options.sortBy! : 'createdAt';
    const sortDir = options.sortDir === 'asc' ? 1 : -1;
    const filter: Record<string, unknown> = this.scope(auth);

    if (options.status && options.status !== 'ALL') filter.status = options.status;
    if (options.assetTypeId) filter.assetTypeId = options.assetTypeId;

    const query = (options.q ?? '').trim();
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const matchingTypes = await this.db.assetType.find({ companyId: auth.companyId, name: regex }).select({ _id: 1 }).lean();
      filter.$or = [
        { assetNumber: regex },
        { status: regex },
        ...(matchingTypes.length ? [{ assetTypeId: { $in: matchingTypes.map((type: any) => String(type._id)) } }] : []),
      ];
    }

    const [total, rows] = await Promise.all([
      this.db.asset.countDocuments(filter),
      this.db.asset.find(filter).sort({ [sortBy]: sortDir, _id: sortDir }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    ]);

    const typeIds = [...new Set(rows.map((row: any) => String(row.assetTypeId)).filter(Boolean))];
    const types = typeIds.length
      ? await this.db.assetType.find({ _id: { $in: typeIds }, companyId: auth.companyId }).select({ _id: 1, name: 1 }).lean()
      : [];
    const typeById = new Map(types.map((type: any) => [String(type._id), type]));

    return {
      items: rows.map((row: any) => ({
        ...toDto(row),
        assetType: typeById.has(String(row.assetTypeId)) ? { name: typeById.get(String(row.assetTypeId)).name } : undefined,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      sort: { sortBy, sortDir: sortDir === 1 ? 'asc' : 'desc' },
    };
  }
}
