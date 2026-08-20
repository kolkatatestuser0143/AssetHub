import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

const MAX_PAGE_SIZE = 100;
const SORT_FIELDS = new Set(['assetNumber', 'status', 'createdAt']);

@Injectable()
export class AssetListService {
  constructor(private readonly prisma: PrismaService) {}

  async list(auth: { tenantId: string; companyId?: string | null; crossCompany?: boolean }, options: { q?: string; status?: string; assetTypeId?: string; page?: number; pageSize?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }) {
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(options.pageSize) || 25));
    const sortBy = SORT_FIELDS.has(options.sortBy ?? '') ? options.sortBy! : 'createdAt';
    const sortDir = options.sortDir === 'asc' ? 'asc' : 'desc';
    const where: any = { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }), ...(options.status && options.status !== 'ALL' ? { status: options.status } : {}), ...(options.assetTypeId ? { assetTypeId: options.assetTypeId } : {}) };
    const q = (options.q ?? '').trim();
    if (q) where.OR = [{ assetNumber: { contains: q, mode: 'insensitive' } }, { status: { contains: q, mode: 'insensitive' } }, { assetType: { name: { contains: q, mode: 'insensitive' }, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } }];
    const [total, rows] = await this.prisma.withTenantContext(auth.tenantId, auth.crossCompany ? null : auth.companyId ?? null, async tx => Promise.all([
      tx.asset.count({ where }),
      tx.asset.findMany({ where, orderBy: [{ [sortBy]: sortDir }, { id: sortDir }], skip: (page - 1) * pageSize, take: pageSize, include: { assetType: { select: { id: true, name: true } } } }),
    ]));
    return { items: rows.map((row: any) => ({ ...row, assetType: row.assetType ? { name: row.assetType.name } : undefined })), pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }, sort: { sortBy, sortDir } };
  }
}
