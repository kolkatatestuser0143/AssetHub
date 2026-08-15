import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';
import { AssetExcelReportFilters } from './asset-excel-report.service';

export interface AssetReportTemplate {
  id: string;
  name: string;
  description?: string | null;
  filters: AssetExcelReportFilters;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class AssetReportTemplateService {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly entitlements: EntitlementService,
  ) {}

  private async requireAccess(auth: AuthContext) {
    await this.entitlements.requireFeature(auth.tenantId, 'advanced_reports_enabled');
  }

  async list(auth: AuthContext) {
    await this.requireAccess(auth);
    const docs = await this.db.assetReportTemplate
      .find({ tenantId: auth.tenantId })
      .sort({ name: 1 })
      .lean();
    return docs.map((doc: any) => this.toDto(doc));
  }

  async create(auth: AuthContext, name: string, description: string | undefined, filters: AssetExcelReportFilters) {
    await this.requireAccess(auth);
    const cleanName = String(name ?? '').trim();
    if (!cleanName) throw new BadRequestException('Template name is required');
    if (cleanName.length > 120) throw new BadRequestException('Template name cannot exceed 120 characters');
    const normalized = this.normalizeFilters(filters);
    const exists = await this.db.assetReportTemplate.findOne({ tenantId: auth.tenantId, name: cleanName }).lean();
    if (exists) throw new BadRequestException('A report template with this name already exists');
    const doc = await this.db.assetReportTemplate.create({
      tenantId: auth.tenantId,
      name: cleanName,
      description: description?.trim() || undefined,
      filters: normalized,
      createdBy: auth.userId,
    });
    return this.toDto(doc.toObject());
  }

  async update(auth: AuthContext, templateId: string, name: string, description: string | undefined, filters: AssetExcelReportFilters) {
    await this.requireAccess(auth);
    const cleanName = String(name ?? '').trim();
    if (!cleanName) throw new BadRequestException('Template name is required');
    const duplicate = await this.db.assetReportTemplate.findOne({
      tenantId: auth.tenantId,
      name: cleanName,
      _id: { $ne: templateId },
    }).lean();
    if (duplicate) throw new BadRequestException('A report template with this name already exists');
    const doc = await this.db.assetReportTemplate.findOneAndUpdate(
      { _id: templateId, tenantId: auth.tenantId },
      { $set: { name: cleanName, description: description?.trim() || undefined, filters: this.normalizeFilters(filters), updatedAt: new Date() } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('Report template not found');
    return this.toDto(doc);
  }

  async remove(auth: AuthContext, templateId: string) {
    await this.requireAccess(auth);
    const result = await this.db.assetReportTemplate.deleteOne({ _id: templateId, tenantId: auth.tenantId });
    if (!result.deletedCount) throw new NotFoundException('Report template not found');
    return { ok: true };
  }

  async get(auth: AuthContext, templateId: string) {
    await this.requireAccess(auth);
    const doc = await this.db.assetReportTemplate.findOne({ _id: templateId, tenantId: auth.tenantId }).lean();
    if (!doc) throw new NotFoundException('Report template not found');
    return this.toDto(doc);
  }

  private normalizeFilters(filters: AssetExcelReportFilters = {}) {
    const allowed = ['status', 'companyId', 'assetTypeId', 'locationId', 'fromDate', 'toDate'] as const;
    const normalized: AssetExcelReportFilters = {};
    for (const key of allowed) {
      const value = filters[key];
      if (value === undefined || value === null || String(value).trim() === '') continue;
      normalized[key] = String(value).trim();
    }
    if (normalized.fromDate && normalized.toDate && new Date(normalized.fromDate).getTime() > new Date(normalized.toDate).getTime()) {
      throw new BadRequestException('fromDate cannot be after toDate');
    }
    return normalized;
  }

  private toDto(doc: any): AssetReportTemplate {
    return {
      id: String(doc._id),
      name: doc.name,
      description: doc.description ?? null,
      filters: doc.filters ?? {},
      createdBy: String(doc.createdBy),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
