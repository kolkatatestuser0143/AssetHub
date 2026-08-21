import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
const MAX_PAGE_SIZE = 100;
@Injectable()
export class AssetSearchService extends TenantScopedRepository {
  constructor(private readonly db: PrismaService) { super(); }
  async list(auth: AuthContext, options: { q?: string; status?: string; assetTypeId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(options.page) || 1), pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(options.pageSize) || 25)), q = (options.q ?? '').trim();
    const where: any = { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) };
    if (options.status && options.status !== 'ALL') where.status = options.status;
    if (options.assetTypeId) where.assetTypeId = options.assetTypeId;
    if (q) where.OR = [{ assetNumber: { contains: q, mode: 'insensitive' } }, { status: { contains: q, mode: 'insensitive' } }, { assetType: { name: { contains: q, mode: 'insensitive' } } }];
    const [total, rows] = await this.db.withTenantContext(auth.tenantId, auth.companyId, tx => Promise.all([tx.asset.count({ where }), tx.asset.findMany({ where, include: { assetType: { select: { id: true, name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize })]));
    return { items: rows.map(asset => ({ ...asset, assetType: asset.assetType ? { id: asset.assetType.id, name: asset.assetType.name } : null })), pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }
  async search(auth: AuthContext, query: string) { return (await this.list(auth, { q: query, page: 1, pageSize: 8 })).items; }
}
