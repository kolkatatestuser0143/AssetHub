import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

const MAX_PAGE_SIZE = 100;
const SORT_FIELDS = new Set(['assetNumber', 'status', 'createdAt']);

export interface PostgresAssetListAuth {
  tenantId: string;
  companyId?: string | null;
  crossCompany?: boolean;
}

@Injectable()
export class AssetListPostgresqlService {
  constructor(private readonly prisma: PrismaService) {}

  async list(auth: PostgresAssetListAuth, options: {
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
    const sortDir = options.sortDir === 'asc' ? 'asc' : 'desc';
    const companyScope = !auth.crossCompany && auth.companyId ? { companyId: auth.companyId } : {};
    const where: any = {
      tenantId: auth.tenantId,
      ...companyScope,
      ...(options.status && options.status !== 'ALL' ? { status: options.status } : {}),
      ...(options.assetTypeId ? { assetTypeId: options.assetTypeId } : {}),
    };

    const query = (options.q ?? '').trim();
    if (query) {
      where.OR = [
        { assetNumber: { contains: query, mode: 'insensitive' } },
        { status: { contains: query, mode: 'insensitive' } },
        { assetType: { name: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await this.prisma.withTenantContext(auth.tenantId, auth.crossCompany ? null : auth.companyId ?? null, async (tx) => {
      return Promise.all([
        tx.asset.count({ where }),
        tx.asset.findMany({
          where,
          orderBy: [{ [sortBy]: sortDir }, { id: sortDir }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { assetType: { select: { name: true } } },
        }),
      ]);
    });

    return {
      items: rows.map((row: any) => ({
        ...row,
        assetType: row.assetType ? { name: row.assetType.name } : undefined,
      })),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      sort: { sortBy, sortDir },
    };
  }
}
