import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

@Injectable()
export class AssetTypeManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(name: string, prefix?: string) {
    const normalizedName = String(name ?? '').trim();
    const normalizedPrefix = String(prefix ?? '').trim().toUpperCase() || normalizedName.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'AST';
    return { normalizedName, normalizedPrefix };
  }

  async create(auth: AuthContext, name: string, prefix?: string, separator = '-', padding = 6) {
    const { normalizedName, normalizedPrefix } = this.normalize(name, prefix);
    if (!normalizedName) throw new ConflictException('Asset type name is required');
    const companyId = auth.companyId;
    const duplicate = await this.prisma.withTenantContext(auth.tenantId, companyId, tx => tx.assetType.findFirst({ where: { companyId, OR: [{ name: normalizedName }, { prefix: normalizedPrefix }] } }));
    if (duplicate) throw new ConflictException('Another asset type already uses this name or prefix');
    return this.prisma.withTenantContext(auth.tenantId, companyId, tx => tx.assetType.create({ data: { companyId, name: normalizedName, prefix: normalizedPrefix, separator: separator || '-', padding: Math.max(1, Number(padding) || 6), nextSequence: 1 } }));
  }

  async update(auth: AuthContext, assetTypeId: string, name: string, prefix: string, separator = '-', padding = 6) {
    const { normalizedName, normalizedPrefix } = this.normalize(name, prefix);
    if (!normalizedName) throw new ConflictException('Asset type name is required');
    const companyId = auth.companyId;
    const existing = await this.prisma.withTenantContext(auth.tenantId, companyId, tx => tx.assetType.findFirst({ where: { id: assetTypeId, companyId } }));
    if (!existing) throw new NotFoundException('Asset type not found');
    const duplicate = await this.prisma.withTenantContext(auth.tenantId, companyId, tx => tx.assetType.findFirst({ where: { companyId, id: { not: assetTypeId }, OR: [{ name: normalizedName }, { prefix: normalizedPrefix }] } }));
    if (duplicate) throw new ConflictException('Another asset type already uses this name or prefix');
    return this.prisma.withTenantContext(auth.tenantId, companyId, tx => tx.assetType.update({ where: { id: assetTypeId }, data: { name: normalizedName, prefix: normalizedPrefix, separator: separator || '-', padding: Math.max(1, Number(padding) || 6) } }));
  }
}
