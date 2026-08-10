import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { AssetLifecycleState } from '../../common/enums';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

@Injectable()
export class AssetsService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) {
    super();
  }

  async listAssets(auth: AuthContext) {
    const docs = await this.db.asset
      .find(this.scope(auth))
      .sort({ createdAt: -1 })
      .lean();
    return toDtoArray(docs);
  }

  async listAssetTypes(auth: AuthContext) {
    const docs = await this.db.assetType
      .find(this.scope(auth))
      .lean();
    return toDtoArray(docs);
  }

  async createAssetType(
    auth: AuthContext,
    name: string,
    numberingRule: { prefix: string; separator?: string; padding?: number },
  ) {
    const doc = await this.db.assetType.create({
      companyId: auth.companyId,
      name,
      numberingRule: {
        prefix: numberingRule.prefix,
        separator: numberingRule.separator ?? '-',
        padding: numberingRule.padding ?? 6,
        nextSequence: 1,
      },
    });
    return toDto(doc.toObject());
  }

  async createAsset(auth: AuthContext, assetTypeId: string, fields: Record<string, unknown>) {
    // assetTypeId is caller-supplied input — never trust it belongs to
    // the caller's own company without checking. This exact gap was
    // caught by test/security/tenant-isolation.spec.ts before it
    // shipped: a caller could mint an asset numbered against another
    // tenant's numbering rule. MongoDB has no RLS, so this app-level
    // check IS the only isolation — never remove it.
    const assetType = await this.db.assetType.findById(assetTypeId).lean();
    if (!assetType) throw new NotFoundException('Asset type not found');
    if (assetType.companyId !== auth.companyId) {
      throw new ForbiddenException('assetTypeId does not belong to your company');
    }

    const assetNumber = await this.generateAssetNumber(assetTypeId);

    const doc = await this.db.asset.create({
      tenantId: auth.tenantId,
      companyId: auth.companyId,
      assetTypeId,
      assetNumber,
      status: AssetLifecycleState.IN_STOCK,
      customFields: (fields as Record<string, string>) ?? {},
    });
    return toDto(doc.toObject());
  }

  /**
   * Numbering must survive concurrent asset creation without producing
   * duplicates (architecture doc §12). MongoDB has no SELECT ... FOR
   * UPDATE, but a findOneAndUpdate is atomic per document: `$inc` the
   * embedded rule's nextSequence and read the pre-increment value in
   * the same op. Two concurrent requests serialize here instead of
   * racing.
   */
  private async generateAssetNumber(assetTypeId: string): Promise<string> {
    const assetType = await this.db.assetType
      .findOneAndUpdate(
        { _id: assetTypeId, 'numberingRule.nextSequence': { $exists: true } },
        { $inc: { 'numberingRule.nextSequence': 1 } },
        { new: true },
      )
      .lean();

    if (!assetType?.numberingRule) {
      throw new NotFoundException('No numbering rule configured for this asset type');
    }

    // pre-increment value = the new value minus one
    const sequence = assetType.numberingRule.nextSequence - 1;
    const rule = assetType.numberingRule;

    const company = await this.db.company.findById(assetType.companyId).lean();
    if (!company) throw new NotFoundException('Company not found');

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
    const filter = this.scope(auth);

    // Read the current status BEFORE the update — the audit event must
    // record the true fromState (the pre-transition status).
    const before = await this.db.asset.findOne({ _id: assetId, ...filter }).lean();
    if (!before) throw new NotFoundException('Asset not found in your scope');

    // Scope-filtered atomic update: only succeeds if the asset still
    // belongs to the caller's tenant/company at write time.
    const updated = await this.db.asset.findOneAndUpdate(
      { _id: assetId, ...filter },
      { $set: { status: toState } },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Asset not found in your scope');

    // Lifecycle transitions are the single source of truth for asset
    // history (architecture doc §12) — every transition writes here,
    // nowhere else maintains a separate "history" table.
    await this.db.assetAuditEvent.create({
      tenantId: auth.tenantId,
      companyId: auth.companyId,
      assetId: assetId,
      fromState: before.status as AssetLifecycleState,
      toState,
      actorUserId,
      reason,
      occurredAt: new Date(),
    });

    return { ok: true };
  }
}
