import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

export type MaintenanceType = 'REPAIR' | 'PREVENTIVE' | 'INSPECTION' | 'OTHER';

@Injectable()
export class AssetMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async asset(auth: AuthContext, assetId: string) {
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } }));
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }

  async list(auth: AuthContext, assetId: string) {
    await this.asset(auth, assetId);
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetMaintenance.findMany({ where: { assetId, tenantId: auth.tenantId, companyId: auth.companyId }, orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }] }));
  }

  async create(auth: AuthContext, assetId: string, input: { serviceDate: string; serviceType: MaintenanceType; provider?: string; technician?: string; notes?: string; nextServiceDate?: string; attachmentDocumentId?: string }) {
    await this.asset(auth, assetId);
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, async tx => tx.assetMaintenance.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId, serviceDate: new Date(input.serviceDate), serviceType: input.serviceType, provider: input.provider?.trim() || null, technician: input.technician?.trim() || null, notes: input.notes?.trim() || null, nextServiceDate: input.nextServiceDate ? new Date(input.nextServiceDate) : null, attachmentDocumentId: input.attachmentDocumentId ?? null, createdByUserId: auth.userId } }));
  }

  async update(auth: AuthContext, assetId: string, recordId: string, input: { serviceDate?: string; serviceType?: MaintenanceType; provider?: string; technician?: string; notes?: string; nextServiceDate?: string }) {
    await this.asset(auth, assetId);
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetMaintenance.updateMany({ where: { id: recordId, assetId, tenantId: auth.tenantId, companyId: auth.companyId }, data: { ...(input.serviceDate ? { serviceDate: new Date(input.serviceDate) } : {}), ...(input.serviceType ? { serviceType: input.serviceType } : {}), ...(input.provider !== undefined ? { provider: input.provider.trim() || null } : {}), ...(input.technician !== undefined ? { technician: input.technician.trim() || null } : {}), ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}), ...(input.nextServiceDate !== undefined ? { nextServiceDate: input.nextServiceDate ? new Date(input.nextServiceDate) : null } : {}) } }));
    if (!result.count) throw new NotFoundException('Maintenance record not found');
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetMaintenance.findUniqueOrThrow({ where: { id: recordId } }));
  }

  async remove(auth: AuthContext, assetId: string, recordId: string) {
    await this.asset(auth, assetId);
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetMaintenance.deleteMany({ where: { id: recordId, assetId, tenantId: auth.tenantId, companyId: auth.companyId } }));
    if (!result.count) throw new NotFoundException('Maintenance record not found');
    return { ok: true };
  }
}
