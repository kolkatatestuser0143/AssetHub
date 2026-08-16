import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { toDto, toDtoArray } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';
import { SiteType } from '../../models/tenancy.schemas';

@Injectable()
export class TenancyService {
  constructor(private readonly db: MongooseDatabaseService, private readonly entitlements: EntitlementService) {}
  private async hasTenantWideScope(auth: AuthContext): Promise<boolean> {
    if (auth.crossCompany) return true;
    const user = await this.db.user.findById(auth.userId).select({ tenantId: 1, roleIds: 1 }).lean();
    if (!user || String(user.tenantId) !== String(auth.tenantId) || !user.roleIds?.length) return false;
    const roles = await this.db.role.find({ _id: { $in: user.roleIds }, tenantId: auth.tenantId }).select({ companyId: 1 }).lean();
    return roles.some((role: any) => role.companyId == null);
  }
  async getTenantProfile(auth: AuthContext) {
    const tenant = await this.db.tenant.findById(auth.tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    const company = await this.db.company.findById(auth.companyId).lean();
    return { id: String(tenant._id), name: tenant.name, slug: tenant.slug, status: tenant.status, primaryEmail: tenant.primaryEmail ?? null, phone: tenant.phone ?? null, website: tenant.website ?? null, logoFileId: tenant.logoFileId ?? null, logoUrl: tenant.logoUrl ?? null, company: company ? { id: String(company._id), name: company.name, code: company.code } : null };
  }
  async updateTenantProfile(auth: AuthContext, input: { name?: string; phone?: string; website?: string; logoFileId?: string; logoUrl?: string }) {
    const tenant = await this.db.tenant.findById(auth.tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    const set: Record<string, unknown> = {};
    for (const key of ['name','phone','website','logoFileId','logoUrl']) { const value = input[key as keyof typeof input]; if (value !== undefined) set[key] = typeof value === 'string' ? value.trim() : value; }
    if (set.name) await this.db.company.updateOne({ _id: auth.companyId, tenantId: auth.tenantId }, { $set: { name: set.name } });
    const updated = await this.db.tenant.findByIdAndUpdate(auth.tenantId, { $set: set }, { new: true }).lean();
    return { id: String(updated?._id), name: updated?.name, slug: updated?.slug, status: updated?.status, primaryEmail: updated?.primaryEmail ?? null, phone: updated?.phone ?? null, website: updated?.website ?? null, logoFileId: updated?.logoFileId ?? null, logoUrl: updated?.logoUrl ?? null };
  }
  async listCompanies(auth: AuthContext) { return toDtoArray(await this.db.company.find({ tenantId: auth.tenantId }).sort({ name: 1 }).lean()); }
  async getAssetHierarchy(auth: AuthContext) {
    const companies = await this.db.company.find({ tenantId: auth.tenantId }).sort({ name: 1 }).lean();
    const companyIds = companies.map((company: any) => String(company._id));
    if (!companyIds.length) return [];
    const sites = await this.db.plant.find({ companyId: { $in: companyIds } }).sort({ type: 1, name: 1 }).lean();
    const siteIds = sites.map((site: any) => String(site._id));
    const locations = siteIds.length ? await this.db.location.find({ plantId: { $in: siteIds } }).sort({ name: 1 }).lean() : [];
    const locationIds = locations.map((location: any) => String(location._id));
    const departments = locationIds.length ? await this.db.department.find({ locationId: { $in: locationIds } }).sort({ name: 1 }).lean() : [];
    const departmentsByLocation = new Map<string, any[]>();
    for (const department of departments as any[]) { const key = String(department.locationId); const list = departmentsByLocation.get(key) ?? []; list.push(toDto(department)); departmentsByLocation.set(key, list); }
    const locationsBySite = new Map<string, any[]>();
    for (const location of locations as any[]) { const key = String(location.plantId); const list = locationsBySite.get(key) ?? []; list.push({ ...toDto(location), departments: departmentsByLocation.get(String(location._id)) ?? [] }); locationsBySite.set(key, list); }
    const sitesByCompany = new Map<string, any[]>();
    for (const site of sites as any[]) { const key = String(site.companyId); const list = sitesByCompany.get(key) ?? []; list.push({ ...toDto(site), type: site.type ?? SiteType.PLANT, locations: locationsBySite.get(String(site._id)) ?? [] }); sitesByCompany.set(key, list); }
    return companies.map((company: any) => ({ ...toDto(company), sites: sitesByCompany.get(String(company._id)) ?? [] }));
  }
  async createCompany(auth: AuthContext, name: string, code: string) {
    if (!(await this.hasTenantWideScope(auth))) throw new ForbiddenException('Only tenant-wide administrators can create companies');
    const normalizedName = name.trim(); const normalizedCode = code.trim().toUpperCase();
    if (!normalizedName) throw new ConflictException('Company name is required');
    if (!normalizedCode) throw new ConflictException('Company code is required');
    const duplicate = await this.db.company.findOne({ tenantId: auth.tenantId, code: normalizedCode }).lean();
    if (duplicate) throw new ConflictException(`Company code '${normalizedCode}' is already in use in this tenant`);
    const count = await this.db.company.countDocuments({ tenantId: auth.tenantId }); await this.entitlements.requireWithinLimit(auth.tenantId, 'max_companies', count, 1);
    try { return toDto((await this.db.company.create({ tenantId: auth.tenantId, name: normalizedName, code: normalizedCode })).toObject()); } catch (error: any) { if (error?.code === 11000) throw new ConflictException(`Company code '${normalizedCode}' is already in use in this tenant`); throw error; }
  }
  async listPlants(auth: AuthContext, companyId: string) { await this.assertCompanyInScope(auth, companyId); return toDtoArray(await this.db.plant.find({ companyId }).sort({ type: 1, name: 1 }).lean()); }
  async createPlant(auth: AuthContext, companyId: string, name: string, type: SiteType) {
    await this.assertCompanyInScope(auth, companyId);
    const normalizedName = name.trim(); if (!normalizedName) throw new ConflictException('Site name is required');
    const siteType = Object.values(SiteType).includes(type) ? type : SiteType.PLANT;
    const siteCount = await this.db.plant.countDocuments({ companyId }); await this.entitlements.requireWithinLimit(auth.tenantId, 'max_sites', siteCount);
    return toDto((await this.db.plant.create({ companyId, name: normalizedName, type: siteType })).toObject());
  }
  async listLocations(auth: AuthContext, siteId: string) { const site = await this.db.plant.findById(siteId).lean(); if (!site) throw new NotFoundException('Site not found'); await this.assertCompanyInScope(auth, site.companyId); return toDtoArray(await this.db.location.find({ plantId: siteId }).lean()); }
  async createLocation(auth: AuthContext, siteId: string, name: string) {
    const site = await this.db.plant.findById(siteId).lean(); if (!site) throw new NotFoundException('Site not found'); await this.assertCompanyInScope(auth, site.companyId);
    const siteIds = (await this.db.plant.find({ companyId: site.companyId }).select({ _id: 1 }).lean()).map((p: any) => String(p._id)); const count = siteIds.length ? await this.db.location.countDocuments({ plantId: { $in: siteIds } }) : 0;
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_locations', count); const normalizedName = name.trim(); if (!normalizedName) throw new ConflictException('Location name is required');
    return toDto((await this.db.location.create({ plantId: siteId, name: normalizedName })).toObject());
  }
  async listDepartments(auth: AuthContext, locationId: string) { const location = await this.db.location.findById(locationId).lean(); if (!location) throw new NotFoundException('Location not found'); const site = await this.db.plant.findById(location.plantId).lean(); if (!site) throw new NotFoundException('Site not found'); await this.assertCompanyInScope(auth, site.companyId); return toDtoArray(await this.db.department.find({ locationId }).lean()); }
  async createDepartment(auth: AuthContext, locationId: string, name: string) {
    const location = await this.db.location.findById(locationId).lean(); if (!location) throw new NotFoundException('Location not found'); const site = await this.db.plant.findById(location.plantId).lean(); if (!site) throw new NotFoundException('Site not found'); await this.assertCompanyInScope(auth, site.companyId);
    const siteIds = (await this.db.plant.find({ companyId: site.companyId }).select({ _id: 1 }).lean()).map((p: any) => String(p._id)); const locationIds = siteIds.length ? (await this.db.location.find({ plantId: { $in: siteIds } }).select({ _id: 1 }).lean()).map((l: any) => String(l._id)) : [];
    const count = locationIds.length ? await this.db.department.countDocuments({ locationId: { $in: locationIds } }) : 0; await this.entitlements.requireWithinLimit(auth.tenantId, 'max_departments', count);
    const normalizedName = name.trim(); if (!normalizedName) throw new ConflictException('Department name is required'); return toDto((await this.db.department.create({ locationId, name: normalizedName })).toObject());
  }
  private async assertCompanyInScope(auth: AuthContext, companyId: string) {
    const company = await this.db.company.findOne({ _id: companyId, tenantId: auth.tenantId }).select({ _id: 1 }).lean();
    if (!company) throw new NotFoundException('Company not found');
    // Organization management is tenant-wide when the route grants company:write/read.
    // The target company only needs to belong to this tenant; auth.companyId is not a valid
    // write-scope restriction here because the Companies & Structure directory is tenant-wide.
  }
}