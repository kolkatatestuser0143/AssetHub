import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

@Injectable()
export class WarrantyService {
  constructor(private readonly prisma: PrismaService) {}

  async get(auth: AuthContext, assetId: string) {
    const asset = await this.requireAsset(auth, assetId);
    if (!asset.warrantyProvider && !asset.warrantyExpiresAt) return null;
    return { assetId: asset.id, companyId: asset.companyId, provider: asset.warrantyProvider, expiresAt: asset.warrantyExpiresAt };
  }

  async upsert(auth: AuthContext, assetId: string, provider?: string, expiresAt?: Date) {
    const asset = await this.requireAsset(auth, assetId);
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.update({ where: { id: asset.id }, data: { warrantyProvider: provider?.trim() || null, warrantyExpiresAt: expiresAt ?? null }, select: { id: true, companyId: true, warrantyProvider: true, warrantyExpiresAt: true } })).then(row => ({ assetId: row.id, companyId: row.companyId, provider: row.warrantyProvider, expiresAt: row.warrantyExpiresAt }));
  }

  async remove(auth: AuthContext, assetId: string) {
    const asset = await this.requireAsset(auth, assetId);
    if (!asset.warrantyProvider && !asset.warrantyExpiresAt) throw new NotFoundException('Warranty not found');
    await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.update({ where: { id: asset.id }, data: { warrantyProvider: null, warrantyExpiresAt: null } }));
    return { ok: true };
  }

  private async requireAsset(auth: AuthContext, assetId: string) {
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } }));
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }
}
