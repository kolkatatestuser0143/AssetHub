import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { AssetLifecycleState } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssets(auth: AuthContext) {
    return this.prisma.asset.findMany({
      where: auth.crossCompany
        ? { tenantId: auth.tenantId }
        : { tenantId: auth.tenantId, companyId: auth.companyId },
      include: { assetType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAssetTypes(auth: AuthContext) {
    return this.prisma.assetType.findMany({
      where: { companyId: auth.companyId },
      include: { numberingRule: true },
    });
  }

  async createAssetType(
    auth: AuthContext,
    name: string,
    numberingRule: { prefix: string; separator?: string; padding?: number },
  ) {
    return this.prisma.assetType.create({
      data: {
        companyId: auth.companyId,
        name,
        numberingRule: {
          create: {
            prefix: numberingRule.prefix,
            separator: numberingRule.separator ?? '-',
            padding: numberingRule.padding ?? 6,
          },
        },
      },
    });
  }

  async createAsset(auth: AuthContext, assetTypeId: string, fields: Record<string, any>) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, async (tx) => {
      // assetTypeId is caller-supplied input — never trust it belongs to
      // the caller's own company without checking. This exact gap was
      // caught by test/security/tenant-isolation.spec.ts before it
      // shipped: AssetType/AssetNumberingRule currently have no RLS
      // policy (see migration TODO), so this app-level check is the
      // ONLY thing preventing a caller from minting an asset numbered
      // against another tenant's numbering rule.
      const assetType = await (tx as any).assetType.findUniqueOrThrow({ where: { id: assetTypeId } });
      if (assetType.companyId !== auth.companyId) {
        throw new ForbiddenException('assetTypeId does not belong to your company');
      }

      const assetNumber = await this.generateAssetNumber(tx as any, assetTypeId);

      return (tx as any).asset.create({
        data: {
          tenantId: auth.tenantId,
          companyId: auth.companyId,
          assetTypeId,
          assetNumber,
          status: AssetLifecycleState.IN_STOCK,
          ...fields,
        },
      });
    });
  }

  /**
   * Numbering must survive concurrent asset creation without producing
   * duplicates (architecture doc §12). We lock the specific
   * AssetNumberingRule row (SELECT ... FOR UPDATE) for the duration of
   * the enclosing transaction, increment, and use the pre-increment
   * value — so two concurrent requests serialize instead of racing.
   */
  private async generateAssetNumber(tx: any, assetTypeId: string): Promise<string> {
    const rows: Array<{ id: string; prefix: string; separator: string; padding: number; nextSequence: number }> =
      await tx.$queryRaw`
        SELECT id, prefix, separator, padding, "nextSequence"
        FROM "AssetNumberingRule"
        WHERE "assetTypeId" = ${assetTypeId}
        FOR UPDATE
      `;

    const rule = rows[0];
    if (!rule) throw new NotFoundException('No numbering rule configured for this asset type');

    const sequence = rule.nextSequence;
    await tx.assetNumberingRule.update({
      where: { id: rule.id },
      data: { nextSequence: sequence + 1 },
    });

    const assetType = await tx.assetType.findUniqueOrThrow({ where: { id: assetTypeId } });
    const company = await tx.company.findUniqueOrThrow({ where: { id: assetType.companyId } });

    const padded = String(sequence).padStart(rule.padding, '0');
    return `${rule.prefix}${rule.separator}${company.code}${rule.separator}${padded}`;
  }

  async transitionState(
    auth: AuthContext,
    assetId: string,
    toState: AssetLifecycleState,
    actorUserId: string,
    reason?: string,
  ) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, async (tx) => {
      const asset = await (tx as any).asset.findFirstOrThrow({
        where: { id: assetId, companyId: auth.companyId },
      });

      await (tx as any).asset.update({ where: { id: assetId }, data: { status: toState } });

      // Lifecycle transitions are the single source of truth for asset
      // history (architecture doc §12) — every transition writes here,
      // nowhere else maintains a separate "history" table.
      await (tx as any).assetAuditEvent.create({
        data: { assetId, fromState: asset.status, toState, actorUserId, reason },
      });

      return { ok: true };
    });
  }
}
