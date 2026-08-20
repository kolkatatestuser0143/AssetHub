import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

const MAX_PAGE_SIZE = 100;

@Injectable()
export class AssetSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async list(auth: { tenantId: string; companyId?: string | null; crossCompany?: boolean }, options: { q?: string; status?: string; assetTypeId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(options.pageSize) || 25));
    const q = (options.q ?? '').trim();
    const companyScope = !auth.crossCompany && auth.companyId ? { companyId: auth.companyId } : {};
    const where: any = {
      tenantId: auth.tenantId,
      ...companyScope,
      ...(options.status && options.status !== 'ALL' ? { status: options.status } : {}),
      ...(options.assetTypeId ? { assetTypeId: options.assetTypeId } : {}),
    };
    if (q) {
      where.OR = [
        { assetNumber: { contains: q, mode: 'insensitive' } },
        { status: { contains: q, mode: 'insensitive' } },
        { assetType: { name: { contains: q, mode: 'insensitive' }, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } },
      ];
    }

    const [total, rows] = await this.prisma.withTenantContext(auth.tenantId, auth.crossCompany ? null : auth.companyId ?? null, async (tx) => Promise.all([
      tx.asset.count({ where }),
      tx.asset.findMany({
        where,
        select: { id: true, assetNumber: true, status: true, assetTypeId: true, createdAt: true, assetType: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]));

    return {
      items: rows.map((asset: any) => ({
        id: asset.id,
        assetNumber: asset.assetNumber,
        status: asset.status,
        assetTypeId: asset.assetTypeId,
        createdAt: asset.createdAt,
        assetType: { id: asset.assetType?.id ?? String(asset.assetTypeId), name: asset.assetType?.name ?? 'Asset' },
      })),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async search(auth: { tenantId: string; companyId?: string | null; crossCompany?: boolean }, query: string) {
    const result = await this.list(auth, { q: query, page: 1, pageSize: 8 });
    return result.items;
  }
}
