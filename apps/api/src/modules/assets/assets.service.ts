import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    return toDtoArray(await this.db.asset.find(this.scope(auth)).sort({ createdAt: -1 }).lean());
  }

  async listAssetTypes(auth: AuthContext) {
    return toDtoArray(await this.db.assetType.find(this.scope(auth)).lean());
  }

  async createAssetType(auth: AuthContext, name: string, numberingRule: { prefix: string; separator?: string; padding?: number }) {
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
    const assetType = await this.db.assetType.findOne({ _id: assetTypeId, companyId: auth.companyId }).lean();
    if (!assetType) {
      throw new ForbiddenException('Asset type does not belong to your company');
    }

    const locationId = this.readOptionalId(fields.locationId);
    const departmentId = this.readOptionalId(fields.departmentId);
    const vendorId = this.readOptionalId(fields.vendorId);

    if (locationId) {
      const location = await this.db.location.findById(locationId).lean();
      if (!location) throw new NotFoundException('Location not found');
      const plant = await this.db.plant.findById(location.plantId).lean();
      const businessUnit = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
      if (!plant || !businessUnit || businessUnit.companyId !== auth.companyId) {
        throw new ForbiddenException('locationId does not belong to your company');
      }
      if (departmentId) {
        const department = await this.db.department.findOne({ _id: departmentId, locationId: location._id }).lean();
        if (!department) throw new ForbiddenException('departmentId does not belong to the selected location');
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
      const vendor = await this.db.vendor.findOne({ _id: vendorId, companyId: auth.companyId }).lean();
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

  async assignAsset(auth: AuthContext, assetId: string, userId: string, notes?: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');

    const user = await this.db.user.findOne({ _id: userId, tenantId: auth.tenantId, companyId: auth.companyId }).lean();
    if (!user) throw new NotFoundException('User not found in your company');
    if (!user.isActive) throw new ForbiddenException('Cannot assign an asset to an inactive user');

    const active = await this.db.assetAssignment.findOne({ assetId, returnedAt: { $exists: false } }).lean();
    if (active) throw new ConflictException('Asset is already assigned');

    try {
      const assignment = await this.db.assetAssignment.create({
        assetId,
        userId,
        assignedAt: new Date(),
        notes,
      });
      return toDto(assignment.toObject());
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Asset is already assigned');
      throw error;
    }
  }

  async getCurrentAssignment(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    const assignment = await this.db.assetAssignment.findOne({ assetId, returnedAt: { $exists: false } }).lean();
    return assignment ? toDto(assignment) : null;
  }

  async unassignAsset(auth: AuthContext, assetId: string, notes?: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');

    const assignment = await this.db.assetAssignment.findOneAndUpdate(
      { assetId, returnedAt: { $exists: false } },
      { $set: { returnedAt: new Date(), ...(notes ? { notes } : {}) } },
      { new: true },
    ).lean();
    if (!assignment) throw new NotFoundException('Asset is not currently assigned');
    return toDto(assignment);
  }

  async listAssignmentHistory(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return toDtoArray(await this.db.assetAssignment.find({ assetId }).sort({ assignedAt: -1 }).lean());
  }

  private readOptionalId(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') throw new ForbiddenException('Relationship IDs must be strings');
    return value;
  }

  private async generateAssetNumber(assetTypeId: string): Promise<string> {
    const assetType = await this.db.assetType.findOneAndUpdate(
      { _id: assetTypeId, 'numberingRule.nextSequence': { $exists: true } },
      { $inc: { 'numberingRule.nextSequence': 1 } },
      { new: true },
    ).lean();
    if (!assetType?.numberingRule) throw new NotFoundException('No numbering rule configured for this asset type');
    const sequence = assetType.numberingRule.nextSequence - 1;
    const rule = assetType.numberingRule;
    const company = await this.db.company.findById(assetType.companyId).lean();
    if (!company) throw new NotFoundException('Company not found');
    return `${rule.prefix}${rule.separator}${company.code}${rule.separator}${String(sequence).padStart(rule.padding, '0')}`;
  }

  async transitionState(auth: AuthContext, assetId: string, toState: AssetLifecycleState, actorUserId: string, reason?: string) {
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
      assetId,
      fromState: before.status as AssetLifecycleState,
      toState,
      actorUserId,
      reason,
      occurredAt: new Date(),
    });
    return { ok: true };
  }
}
