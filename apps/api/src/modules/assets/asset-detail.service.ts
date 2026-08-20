import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class AssetDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async get(auth: { tenantId: string; companyId?: string | null; crossCompany?: boolean }, assetId: string) {
    const companyScope = !auth.crossCompany && auth.companyId ? { companyId: auth.companyId } : {};
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.crossCompany ? null : auth.companyId ?? null, tx => tx.asset.findFirst({
      where: { id: assetId, tenantId: auth.tenantId, ...companyScope },
      include: {
        assetType: { select: { id: true, name: true, companyId: true } },
        assignments: { where: { returnedAt: null }, orderBy: { assignedAt: 'desc' }, take: 1, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, companyId: true, isActive: true } } } },
      },
    }));
    if (!asset) throw new NotFoundException('Asset not found');
    const assignment = asset.assignments[0] ?? null;
    const user = assignment?.user && (auth.crossCompany || assignment.user.companyId === auth.companyId) ? assignment.user : null;
    const { assignments: _assignments, assetType, ...assetDto } = asset;
    return { ...assetDto, assetType: assetType ? { id: assetType.id, name: assetType.name } : undefined, assignment: assignment ? { ...assignment, user } : null };
  }
}
