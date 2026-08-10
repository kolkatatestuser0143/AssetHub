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

  async createAsset(
    auth: AuthContext,
    assetTypeId: string,
    fields: Record<string, unknown>,
  ) {
    // assetTypeId is caller-supplied input — never trust it belongs to
    // the caller's own company without checking. MongoDB has no RLS, so
    // this application-level ownership check is part of the security
    // boundary.
    const assetType = await this.db.assetType
      .findOne({ _id: assetTypeId, companyId: auth.companyId })
      .lean();
    if (!assetType) throw new NotFoundException('Asset type not found in your company');

    const locationId = this.readOptionalId(fields.locationId);
    const departmentId = this.readOptionalId(fields.departmentId);
    const vendorId = this.readOptionalId(fields.vendorId);

    if (locationId) {
      const location = await this.db.location.findById(locationId).lean();
      if (!location) throw new NotFoundException('Location not found');
      const department = await this.db.department.findOne({ locationId: location._id }).lean();
      const plant = await this.db.plant.findById(location.plantId).lean();
      const businessUnit = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
      if (!plant || !businessUnit || businessUnit.companyId !== auth.companyId) {
        throw new ForbiddenException('locationId does not belong to your company');
      }
      if (departmentId && (!department || String(department._id) !== departmentId)) {
        throw new ForbiddenException('departmentId does not belong to the selected location');
      }
    } else if (departmentId) {
      const department = await this.db.department.findById(departmentId).lean();
      if (!department) throw new NotFoundException('Department not found');
      const location = await this.db.location.findById(department.locationId).lean();
      const plant = location ? await this.db.plant.findById(location.plantId).lean() : null;
      const businessUnit = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
      if (!location || !plant || !businessUnit || businessUnit.companyId !== auth.companyId) {
        throw new ForbiddenException('departmentId does not belong to your company');
      }
    }

    if (vendorId) {
      const vendor = await this.db.vendor
        .findOne({ _id: vendorId, companyId: auth.companyId })
        .lean();
      if (!vendor) throw new ForbiddenException('vendorId does not belong to your company');
    }

    const assetNumber = await this.generateAssetNumber(assetTypeId);

    const customFields = { ...fields };
    delete customFields.locationId;
    delete customFields.departmentId;
    delete customFields.vendorId;

    const doc = await this.db.asset.create({
      tenantId: auth.tenantId,
      companyId: auth.companyId,
      assetTypeId,
      assetNumber,
      status: AssetLifecycleState.IN_STOCK,
      locationId,
      departmentId,
      vendorId,
      customFields: customFields as Record<string, string>,
    });
    return toDto(doc.toObject());
  }

  private readOptionalId(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') throw new ForbiddenException('Relationship IDs must be strings');
    return value;
  }

  /**
   * Numbering must survive concurrent asset creation without producing
   * duplicates. MongoDB single-document atomicity via $inc serializes
   * concurrent sequence allocation.
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

    const before = await this.db.asset.findOne({ _id: assetId, ...filter }).lean();
    if (!before) throw new NotFoundException('Asset not found in your scope');

    const updated = await this.db.asset.findOneAndUpdate(
      { _id: assetId, ...filter },
      { $set: { status: toState } },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Asset not found in your scope');

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
