import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

export interface PostgresAssetDetailAuth {
  tenantId: string;
  companyId?: string | null;
  crossCompany?: boolean;
}

@Injectable()
export class AssetDetailPostgresqlService {
  constructor(private readonly prisma: PrismaService) {}

  async get(auth: PostgresAssetDetailAuth, assetId: string) {
    const companyScope = !auth.crossCompany && auth.companyId ? { companyId: auth.companyId } : {};
    const asset = await this.prisma.withTenantContext(
      auth.tenantId,
      auth.crossCompany ? null : auth.companyId ?? null,
      (tx) => tx.asset.findFirst({
        where: { id: assetId, tenantId: auth.tenantId, ...companyScope },
        include: {
          assetType: { select: { id: true, name: true, companyId: true } },
          assignments: {
            where: { returnedAt: null },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            include: {
              user: {
                select: {
                  id: true,
                  employeeId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  jobTitle: true,
                  companyId: true,
                  accountType: true,
                },
              },
            },
          },
        },
      }),
    );

    if (!asset) throw new NotFoundException('Asset not found');

    const assignment = asset.assignments[0] ?? null;
    const user = assignment?.user &&
      assignment.user.accountType === 'TENANT' &&
      (auth.crossCompany || assignment.user.companyId === auth.companyId)
      ? assignment.user
      : null;

    const { assignments: _assignments, assetType, ...assetDto } = asset;

    return {
      ...assetDto,
      assetType: assetType ? { id: assetType.id, name: assetType.name } : undefined,
      assignment: assignment
        ? {
            id: assignment.id,
            assetId: assignment.assetId,
            userId: assignment.userId,
            assignedAt: assignment.assignedAt,
            returnedAt: assignment.returnedAt,
            notes: assignment.notes,
            conditionAtReturn: assignment.conditionAtReturn,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
            user,
          }
        : null,
    };
  }
}
