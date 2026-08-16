import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { toDto, toDtoArray } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';

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

  async updateTenantProfile(auth: AuthContext, input: { name?: string; primaryEmail?: string; phone?: string; website?: string; logoFileId?: string; logoUrl?: string }) {
    const tenant = await this.db.tenant.findById(auth.tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    const set: Record<string, unknown> = {};
    for (const key of ['name','primaryEmail','phone','website','logoFileId','logoUrl']) {
      const value = input[key as keyof typeof input];
      if (value !== undefined) set[key] = typeof value === 'string' ? value.trim() : value;
    }
    if (set.name) await this.db.company.updateOne({ _id: auth.companyId, tenantId: auth.tenantId }, { $set: { name: set.name } });
    const updated = await this.db.tenant.findByIdAndUpdate(auth.tenantId, { $set: set }, { new: true }).lean();
    return { id: String(updated?._id), name: updated?.name, slug: updated?.slug, status: updated?.status, primaryEmail: updated?.primaryEmail ?? null, phone: updated?.phone ?? null, website: updated?.website ?? null, logoFileId: updated?.logoFileId ?? null, logoUrl: updated?.logoUrl ?? null };
  }

  async listCompanies(auth: AuthContext) {
    return toDtoArray(await this.db.company.find({ tenantId: auth.tenantId }).sort({ name: 1 }).lean());
  }

  async getAssetHierarchy(auth: AuthContext) {
    const companies = await this.db.company.find({ tenantId: auth.tenantId }).sort({ name: 1 }).lean();
    const companyIds = companies.map((company: any) => String(company._id));
    if (!companyIds.length) return [];
    const businessUnits = await this.db.businessUnit.find({ companyId: { $in: companyIds } }).sort({ name: 1 }).lean();
    const businessUnitIds = businessUnits.map((unit: any) => String(unit._id));
    const plants = businessUnitIds.length ? await this.db.plant.find({ businessUnitId: { $in: businessUnitIds } }).sort({ name: 1 }).lean() : [];
    const plantIds = plants.map((plant: any) => String(plant._id));
    const locations = plantIds.length ? await this.db.location.find({ plantId: { $in: plantIds } }).sort({ name: 1 }).lean() : [];
    const locationIds = locations.map((location: any) => String(location._id));
    const departments = locationIds.length ? await this.db.department.find({ locationId: { $in: locationIds } }).sort({ name: 1 }).lean() : [];
    const departmentsByLocation = new Map<string, any[]>();
    for (const department of departments as any[]) { const key = String(department.locationId); const list = departmentsByLocation.get(key) ?? []; list.push(toDto(department)); departmentsByLocation.set(key, list); }
    const locationsByPlant = new Map<string, any[]>();
    for (const location of locations as any[]) { const key = String(location.plantId); const list = locationsByPlant.get(key) ?? []; list.push({ ...toDto(location), departments: departmentsByLocation.get(String(location._id)) ?? [] }); locationsByPlant.set(key, list); }
    const plantsByBusinessUnit = new Map<string, any[]>();
    for (const plant of plants as any[]) { const key = String(plant.businessUnitId); const list = plantsByBusinessUnit.get(key) ?? []; list.push({ ...toDto(plant), locations: locationsByPlant.get(String(plant._id)) ?? [] }); plantsByBusinessUnit.set(key, list); }
    const businessUnitsByCompany = new Map<string, any[]>();
    for (const unit of businessUnits as any[]) { const key = String(unit.companyId); const list = businessUnitsByCompany.get(key) ?? []; list.push({ ...toDto(unit), plants: plantsByBusinessUnit.get(String(unit._id)) ?? [] }); businessUnitsByCompany.set(key, list); }
    return companies.map((company: any) => ({ ...toDto(company), businessUnits: businessUnitsByCompany.get(String(company._id)) ?? [] }));
  }

  async createCompany(auth: AuthContext, name: string, code: string) {
    if (!(await this.hasTenantWideScope(auth))) throw new ForbiddenException('Only tenant-wide administrators can create companies');
    const normalizedName = name.trim(); const normalizedCode = code.trim().toUpperCase();
    if (!normalizedName) throw new ConflictException('Company name is required');
    if (!normalizedCode) throw new ConflictException('Company code is required');
    const duplicate = await this.db.company.findOne({ tenantId: auth.tenantId, code: normalizedCode }).lean();
    if (duplicate) throw new ConflictException(`Company code '${normalizedCode}' is already in use in this tenant`);
    const count = await this.db.company.countDocuments({ tenantId: auth.tenantId }); await this.entitlements.requireWithinLimit(auth.tenantId, 'max_companies', count, 1);
    try { return toDto((await this.db.company.create({ tenantId: auth.tenantId, name: normalizedName, code: normalizedCode })).toObject()); }
    catch (error: any) { if (error?.code === 11000) throw new ConflictException(`Company code '${normalizedCode}' is already in use in this tenant`); throw error; }
  }

  async listBusinessUnits(auth: AuthContext, companyId: string) { await this.assertCompanyInScope(auth,companyId); return toDtoArray(await this.db.businessUnit.find({companyId, tenantId: auth.tenantId}).lean()); }
  async createBusinessUnit(auth: AuthContext, companyId: string, name: string) { await this.assertCompanyInScope(auth,companyId); const companyIds=await this.db.company.find({tenantId:auth.tenantId}).select({_id:1}).lean(); const count=companyIds.length?await this.db.businessUnit.countDocuments({companyId:{$in:companyIds.map((c:any)=>String(c._id))}}):0; await this.entitlements.requireWithinLimit(auth.tenantId,'max_business_units',count); return toDto((await this.db.businessUnit.create({companyId,name:name.trim()})).toObject()); }
  async listPlants(auth: AuthContext, businessUnitId: string) { const bu=await this.db.businessUnit.findById(businessUnitId).lean(); if(!bu)throw new NotFoundException('BusinessUnit not found'); await this.assertCompanyInScope(auth,bu.companyId); return toDtoArray(await this.db.plant.find({businessUnitId}).lean()); }
  async createPlant(auth:AuthContext,businessUnitId:string,name:string){const bu=await this.db.businessUnit.findById(businessUnitId).lean();if(!bu)throw new NotFoundException('BusinessUnit not found');await this.assertCompanyInScope(auth,bu.companyId);const businessUnitIds=await this.db.businessUnit.find({}).select({_id:1,companyId:1}).lean();const companyIds=await this.db.company.find({tenantId:auth.tenantId}).select({_id:1}).lean();const tenantCompanyIds=new Set(companyIds.map((c:any)=>String(c._id)));const tenantBusinessUnitIds=businessUnitIds.filter((b:any)=>tenantCompanyIds.has(String(b.companyId))).map((b:any)=>String(b._id));const count=tenantBusinessUnitIds.length?await this.db.plant.countDocuments({businessUnitId:{$in:tenantBusinessUnitIds}}):0;await this.entitlements.requireWithinLimit(auth.tenantId,'max_plants',count);return toDto((await this.db.plant.create({businessUnitId,name:name.trim()})).toObject());}
  async listLocations(auth:AuthContext,plantId:string){const plant=await this.db.plant.findById(plantId).lean();if(!plant)throw new NotFoundException('Plant not found');const bu=await this.db.businessUnit.findById(plant.businessUnitId).lean();if(!bu)throw new NotFoundException('BusinessUnit not found');await this.assertCompanyInScope(auth,bu.companyId);return toDtoArray(await this.db.location.find({plantId}).lean());}
  async createLocation(auth:AuthContext,plantId:string,name:string){const plant=await this.db.plant.findById(plantId).lean();if(!plant)throw new NotFoundException('Plant not found');const bu=await this.db.businessUnit.findById(plant.businessUnitId).lean();if(!bu)throw new NotFoundException('BusinessUnit not found');await this.assertCompanyInScope(auth,bu.companyId);const plantIds=await this.db.plant.find({}).select({_id:1,businessUnitId:1}).lean();const businessUnitIds=await this.db.businessUnit.find({}).select({_id:1,companyId:1}).lean();const companyIds=await this.db.company.find({tenantId:auth.tenantId}).select({_id:1}).lean();const tenantCompanyIds=new Set(companyIds.map((c:any)=>String(c._id)));const tenantBusinessUnitIds=new Set(businessUnitIds.filter((b:any)=>tenantCompanyIds.has(String(b.companyId))).map((b:any)=>String(b._id)));const tenantPlantIds=plantIds.filter((p:any)=>tenantBusinessUnitIds.has(String(p.businessUnitId))).map((p:any)=>String(p._id));const count=tenantPlantIds.length?await this.db.location.countDocuments({plantId:{$in:tenantPlantIds}}):0;await this.entitlements.requireWithinLimit(auth.tenantId,'max_locations',count);return toDto((await this.db.location.create({plantId,name:name.trim()})).toObject());}
  async listDepartments(auth:AuthContext,locationId:string){const location=await this.db.location.findById(locationId).lean();if(!location)throw new NotFoundException('Location not found');const plant=await this.db.plant.findById(location.plantId).lean();if(!plant)throw new NotFoundException('Plant not found');const bu=await this.db.businessUnit.findById(plant.businessUnitId).lean();if(!bu)throw new NotFoundException('BusinessUnit not found');await this.assertCompanyInScope(auth,bu.companyId);return toDtoArray(await this.db.department.find({locationId}).lean());}
  async createDepartment(auth:AuthContext,locationId:string,name:string){const location=await this.db.location.findById(locationId).lean();if(!location)throw new NotFoundException('Location not found');const plant=await this.db.plant.findById(location.plantId).lean();if(!plant)throw new NotFoundException('Plant not found');const bu=await this.db.businessUnit.findById(plant.businessUnitId).lean();if(!bu)throw new NotFoundException('BusinessUnit not found');await this.assertCompanyInScope(auth,bu.companyId);const locationIds=await this.db.location.find({}).select({_id:1,plantId:1}).lean();const plantIds=await this.db.plant.find({}).select({_id:1,businessUnitId:1}).lean();const businessUnitIds=await this.db.businessUnit.find({}).select({_id:1,companyId:1}).lean();const companyIds=await this.db.company.find({tenantId:auth.tenantId}).select({_id:1}).lean();const tenantCompanyIds=new Set(companyIds.map((c:any)=>String(c._id)));const tenantBusinessUnitIds=new Set(businessUnitIds.filter((b:any)=>tenantCompanyIds.has(String(b.companyId))).map((b:any)=>String(b._id)));const tenantPlantIds=new Set(plantIds.filter((p:any)=>tenantBusinessUnitIds.has(String(p.businessUnitId))).map((p:any)=>String(p._id)));const tenantLocationIds=locationIds.filter((l:any)=>tenantPlantIds.has(String(l.plantId))).map((l:any)=>String(l._id));const count=tenantLocationIds.length?await this.db.department.countDocuments({locationId:{$in:tenantLocationIds}}):0;await this.entitlements.requireWithinLimit(auth.tenantId,'max_departments',count);return toDto((await this.db.department.create({locationId,name:name.trim()})).toObject());}

  private async assertCompanyInScope(auth:AuthContext,companyId:string){
    const company = await this.db.company.findOne({ _id: companyId, tenantId: auth.tenantId }).select({ _id: 1 }).lean();
    if (!company) throw new NotFoundException('Company not found');
  }
}
