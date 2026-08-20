import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { AssetCondition, AssetLifecycleState } from '../../common/enums';
import { EntitlementService } from '../billing/entitlement.service';
import { allowedLifecycleTransitions, assertLifecycleTransition } from './asset-lifecycle';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementService) {}

  private async scopedAsset(auth: AuthContext, assetId: string) {
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } }));
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }

  async listAssets(auth: AuthContext) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findMany({ where: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }, orderBy: { createdAt: 'desc' } }));
  }

  async listAssetTypes(auth: AuthContext) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetType.findMany({ where: { companyId: auth.companyId }, orderBy: { name: 'asc' } }));
  }

  async createAssetType(auth: AuthContext, name: string, numberingRule: { prefix: string; separator?: string; padding?: number }) {
    const normalizedName = name.trim();
    const normalizedPrefix = numberingRule.prefix.trim().toUpperCase();
    if (!normalizedName) throw new ConflictException('Asset type name is required');
    if (!normalizedPrefix) throw new ConflictException('Asset type prefix is required');
    const duplicate = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetType.findFirst({ where: { companyId: auth.companyId, OR: [{ name: normalizedName }, { prefix: normalizedPrefix }] } }));
    if (duplicate) throw new ConflictException('Another asset type already uses this name or prefix');
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetType.create({ data: { companyId: auth.companyId, name: normalizedName, prefix: normalizedPrefix, separator: numberingRule.separator ?? '-', padding: Math.max(1, numberingRule.padding ?? 6), nextSequence: 1 } }));
  }

  async deleteAssetType(auth: AuthContext, assetTypeId: string) {
    const type = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetType.findFirst({ where: { id: assetTypeId, companyId: auth.companyId } }));
    if (!type) throw new NotFoundException('Asset type not found');
    const referenced = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.count({ where: { assetTypeId, companyId: auth.companyId } }));
    if (referenced) throw new ConflictException('Asset type is referenced by assets and cannot be deleted');
    await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetType.delete({ where: { id: assetTypeId } }));
    return { ok: true };
  }

  async updateCondition(auth: AuthContext, assetId: string, condition: AssetCondition) {
    if (!Object.values(AssetCondition).includes(condition)) throw new ForbiddenException('Invalid asset condition');
    await this.scopedAsset(auth, assetId);
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.update({ where: { id: assetId }, data: { condition } }));
  }

  async createAsset(auth: AuthContext, assetTypeId: string, fields: Record<string, unknown>) {
    const assetType = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetType.findFirst({ where: { id: assetTypeId, companyId: auth.companyId } }));
    if (!assetType) throw new ForbiddenException('Asset type does not belong to your company');
    const currentAssetCount = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.count({ where: { tenantId: auth.tenantId } }));
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_assets', currentAssetCount, 1);

    const locationId = typeof fields.locationId === 'string' ? fields.locationId : undefined;
    const departmentId = typeof fields.departmentId === 'string' ? fields.departmentId : undefined;
    const vendorId = typeof fields.vendorId === 'string' ? fields.vendorId : undefined;
    if (locationId) {
      const location = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.location.findFirst({ where: { id: locationId, site: { tenantId: auth.tenantId, companyId: auth.companyId } } }));
      if (!location) throw new NotFoundException('Location not found');
      if (departmentId) {
        const department = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.department.findFirst({ where: { id: departmentId, locationId } }));
        if (!department) throw new ForbiddenException('departmentId does not belong to the selected location');
      }
    } else if (departmentId) {
      const department = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.department.findFirst({ where: { id: departmentId, location: { site: { tenantId: auth.tenantId, companyId: auth.companyId } } } }));
      if (!department) throw new NotFoundException('Department not found');
    }
    if (vendorId) {
      const vendor = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.findFirst({ where: { id: vendorId, tenantId: auth.tenantId, companyId: auth.companyId } }));
      if (!vendor) throw new ForbiddenException('vendorId does not belong to your company');
    }

    const serialNumber = typeof fields.serialNumber === 'string' ? fields.serialNumber.trim() : '';
    if (serialNumber) {
      const duplicateSerial = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { tenantId: auth.tenantId, serialNumber } }));
      if (duplicateSerial) throw new ConflictException(`Serial number '${serialNumber}' is already assigned to asset ${duplicateSerial.assetNumber}`);
    }

    const assetNumber = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, async tx => {
      const type = await tx.assetType.update({ where: { id: assetTypeId }, data: { nextSequence: { increment: 1 } } });
      const sequence = type.nextSequence - 1;
      return `${type.prefix ?? 'AST'}${type.separator ?? '-'}${String(sequence).padStart(type.padding ?? 6, '0')}`;
    });
    const customFields = { ...fields };
    for (const key of ['locationId', 'departmentId', 'vendorId', 'condition', 'serialNumber', 'model']) delete customFields[key];
    const condition = Object.values(AssetCondition).includes(String(fields.condition) as AssetCondition) ? String(fields.condition) : AssetCondition.GOOD;
    try {
      return await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetTypeId, assetNumber, status: AssetLifecycleState.IN_STOCK, condition, serialNumber: serialNumber || null, model: typeof fields.model === 'string' ? fields.model.trim() || null : null, locationId: locationId ?? null, departmentId: departmentId ?? null, vendorId: vendorId ?? null, barcodeValue: assetNumber, customFields } }));
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Asset could not be created because a unique value is already in use');
      throw error;
    }
  }

  async listAssignments(auth: AuthContext) {
    const assignments = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAssignment.findMany({ where: { asset: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } }, orderBy: { assignedAt: 'desc' }, include: { asset: true, user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true, companyId: true } } } }));
    return assignments.map(a => ({ ...a, active: !a.returnedAt }));
  }

  async listAssignmentHistory(auth: AuthContext, assetId: string) {
    await this.scopedAsset(auth, assetId);
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAssignment.findMany({ where: { assetId }, orderBy: { assignedAt: 'desc' }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, companyId: true } } } }));
  }

  async getCurrentAssignment(auth: AuthContext, assetId: string) {
    await this.scopedAsset(auth, assetId);
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAssignment.findFirst({ where: { assetId, returnedAt: null }, orderBy: { assignedAt: 'desc' }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, companyId: true } } } }));
  }

  async allowedLifecycleTransitions(auth: AuthContext, assetId: string) {
    const asset = await this.scopedAsset(auth, assetId);
    return allowedLifecycleTransitions(asset.status as AssetLifecycleState);
  }

  async transitionState(auth: AuthContext, assetId: string, toState: AssetLifecycleState, actorUserId: string, reason?: string) {
    const asset = await this.scopedAsset(auth, assetId);
    assertLifecycleTransition(asset.status as AssetLifecycleState, toState, reason);
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, async tx => {
      const changed = await tx.asset.updateMany({ where: { id: assetId, tenantId: auth.tenantId, status: asset.status, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }, data: { status: toState } });
      if (!changed.count) throw new ConflictException('Asset changed before lifecycle transition; retry');
      await tx.assetAuditEvent.create({ data: { tenantId: auth.tenantId, companyId: asset.companyId, assetId, fromState: asset.status, toState, actorUserId, reason: reason?.trim() || null, occurredAt: new Date() } });
      return tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    });
  }

  async getReportSummary(auth: AuthContext) {
    const assets = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findMany({ where: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) } }));
    const assetIds = assets.map(a => a.id);
    const [assignments, vendors, maintenance] = await Promise.all([
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetAssignment.findMany({ where: { assetId: { in: assetIds } }, select: { assetId: true, userId: true, assignedAt: true, returnedAt: true } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.findMany({ where: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) }, select: { id: true } })),
      this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetMaintenance.findMany({ where: { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }), assetId: { in: assetIds } }, select: { assetId: true, nextServiceDate: true } })),
    ]);
    const now = Date.now(); const in30 = now + 30 * 86400000; const statusCounts: Record<string, number> = {}; const conditionCounts: Record<string, number> = {};
    for (const asset of assets) { statusCounts[asset.status] = (statusCounts[asset.status] ?? 0) + 1; conditionCounts[asset.condition] = (conditionCounts[asset.condition] ?? 0) + 1; }
    const warranties = assets.filter(a => a.warrantyProvider || a.warrantyExpiresAt);
    const expiredWarrantyCount = warranties.filter(a => a.warrantyExpiresAt && a.warrantyExpiresAt.getTime() < now).length;
    const expiringWarrantyCount = warranties.filter(a => a.warrantyExpiresAt && a.warrantyExpiresAt.getTime() >= now && a.warrantyExpiresAt.getTime() <= in30).length;
    const overdueMaintenanceCount = maintenance.filter(m => m.nextServiceDate && m.nextServiceDate.getTime() < now).length;
    const dueMaintenanceCount = maintenance.filter(m => m.nextServiceDate && m.nextServiceDate.getTime() >= now && m.nextServiceDate.getTime() <= in30).length;
    const currentlyAssigned = assignments.filter(a => !a.returnedAt).length;
    return { generatedAt: new Date().toISOString(), totals: { assets: assets.length, assignedAssets: currentlyAssigned, assignmentRecords: assignments.length, vendors: vendors.length, warranties: warranties.length, expiredWarranties: expiredWarrantyCount, expiringWarranties: expiringWarrantyCount, overdueMaintenance: overdueMaintenanceCount, dueMaintenance: dueMaintenanceCount }, statusCounts, conditionCounts, assets: assets.map(a => ({ id: a.id, assetNumber: a.assetNumber, status: a.status, condition: a.condition, assetTypeId: a.assetTypeId, vendorId: a.vendorId, warranty: a.warrantyProvider || a.warrantyExpiresAt ? { assetId: a.id, companyId: a.companyId, provider: a.warrantyProvider, expiresAt: a.warrantyExpiresAt } : null })) };
  }

  async listVendors(auth: AuthContext) { return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.findMany({ where: { tenantId: auth.tenantId, companyId: auth.companyId }, orderBy: { name: 'asc' } })); }
  async createVendor(auth: AuthContext, name: string, contact?: string) { const current = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.count({ where: { tenantId: auth.tenantId } })); await this.entitlements.requireWithinLimit(auth.tenantId, 'max_vendors', current, 1); try { return await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, name: name.trim(), contact: contact?.trim() || null } })); } catch (error: any) { if (error?.code === 'P2002') throw new ConflictException('Vendor already exists'); throw error; } }
  async updateVendor(auth: AuthContext, vendorId: string, name: string, contact?: string) { const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.updateMany({ where: { id: vendorId, tenantId: auth.tenantId, companyId: auth.companyId }, data: { name: name.trim(), contact: contact?.trim() || null } })); if (!result.count) throw new NotFoundException('Vendor not found'); return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.findUniqueOrThrow({ where: { id: vendorId } })); }
  async deleteVendor(auth: AuthContext, vendorId: string) { const referenced = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.count({ where: { vendorId, companyId: auth.companyId } })); if (referenced) throw new ConflictException('Vendor is referenced by an asset'); const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.vendor.deleteMany({ where: { id: vendorId, tenantId: auth.tenantId, companyId: auth.companyId } })); if (!result.count) throw new NotFoundException('Vendor not found'); return { ok: true }; }
  async listWarranties(auth: AuthContext) { const assets = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findMany({ where: { tenantId: auth.tenantId, companyId: auth.companyId, OR: [{ warrantyProvider: { not: null } }, { warrantyExpiresAt: { not: null } }] }, orderBy: { warrantyExpiresAt: 'asc' } })); return assets.map(a => ({ assetId: a.id, companyId: a.companyId, provider: a.warrantyProvider, expiresAt: a.warrantyExpiresAt })); }
}
