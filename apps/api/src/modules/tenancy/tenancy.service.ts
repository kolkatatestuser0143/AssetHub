import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';

@Injectable()
export class TenancyService extends TenantScopedRepository {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly entitlements: EntitlementService,
  ) {
    super();
  }

  async listCompanies(auth: AuthContext) {
    const docs = await this.db.company.find(this.scope(auth)).lean();
    return toDtoArray(docs);
  }

  async createCompany(auth: AuthContext, name: string, code: string) {
    const count = await this.db.company.countDocuments({ tenantId: auth.tenantId });
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_companies', count);
    const doc = await this.db.company.create({ tenantId: auth.tenantId, name, code });
    return toDto(doc.toObject());
  }

  async listBusinessUnits(auth: AuthContext, companyId: string) {
    await this.assertCompanyInScope(auth, companyId);
    const docs = await this.db.businessUnit.find({ companyId }).lean();
    return toDtoArray(docs);
  }

  async createBusinessUnit(auth: AuthContext, companyId: string, name: string) {
    await this.assertCompanyInScope(auth, companyId);
    const companyIds = await this.db.company.find({ tenantId: auth.tenantId }).select({ _id: 1 }).lean();
    const count = companyIds.length
      ? await this.db.businessUnit.countDocuments({ companyId: { $in: companyIds.map((c: any) => String(c._id)) } })
      : 0;
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_business_units', count);
    const doc = await this.db.businessUnit.create({ companyId, name });
    return toDto(doc.toObject());
  }

  async listPlants(auth: AuthContext, businessUnitId: string) {
    const bu = await this.db.businessUnit.findById(businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const docs = await this.db.plant.find({ businessUnitId }).lean();
    return toDtoArray(docs);
  }

  async createPlant(auth: AuthContext, businessUnitId: string, name: string) {
    const bu = await this.db.businessUnit.findById(businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const businessUnitIds = await this.db.businessUnit.find({}).select({ _id: 1, companyId: 1 }).lean();
    const companyIds = await this.db.company.find({ tenantId: auth.tenantId }).select({ _id: 1 }).lean();
    const tenantCompanyIds = new Set(companyIds.map((c: any) => String(c._id)));
    const tenantBusinessUnitIds = businessUnitIds.filter((b: any) => tenantCompanyIds.has(String(b.companyId))).map((b: any) => String(b._id));
    const count = tenantBusinessUnitIds.length ? await this.db.plant.countDocuments({ businessUnitId: { $in: tenantBusinessUnitIds } }) : 0;
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_plants', count);
    const doc = await this.db.plant.create({ businessUnitId, name });
    return toDto(doc.toObject());
  }

  async listLocations(auth: AuthContext, plantId: string) {
    const plant = await this.db.plant.findById(plantId).lean();
    if (!plant) throw new NotFoundException('Plant not found');
    const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const docs = await this.db.location.find({ plantId }).lean();
    return toDtoArray(docs);
  }

  async createLocation(auth: AuthContext, plantId: string, name: string) {
    const plant = await this.db.plant.findById(plantId).lean();
    if (!plant) throw new NotFoundException('Plant not found');
    const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const plantIds = await this.db.plant.find({}).select({ _id: 1, businessUnitId: 1 }).lean();
    const businessUnitIds = await this.db.businessUnit.find({}).select({ _id: 1, companyId: 1 }).lean();
    const companyIds = await this.db.company.find({ tenantId: auth.tenantId }).select({ _id: 1 }).lean();
    const tenantCompanyIds = new Set(companyIds.map((c: any) => String(c._id)));
    const tenantBusinessUnitIds = new Set(businessUnitIds.filter((b: any) => tenantCompanyIds.has(String(b.companyId))).map((b: any) => String(b._id)));
    const tenantPlantIds = plantIds.filter((p: any) => tenantBusinessUnitIds.has(String(p.businessUnitId))).map((p: any) => String(p._id));
    const count = tenantPlantIds.length ? await this.db.location.countDocuments({ plantId: { $in: tenantPlantIds } }) : 0;
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_locations', count);
    const doc = await this.db.location.create({ plantId, name });
    return toDto(doc.toObject());
  }

  async listDepartments(auth: AuthContext, locationId: string) {
    const location = await this.db.location.findById(locationId).lean();
    if (!location) throw new NotFoundException('Location not found');
    const plant = await this.db.plant.findById(location.plantId).lean();
    if (!plant) throw new NotFoundException('Plant not found');
    const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const docs = await this.db.department.find({ locationId }).lean();
    return toDtoArray(docs);
  }

  async createDepartment(auth: AuthContext, locationId: string, name: string) {
    const location = await this.db.location.findById(locationId).lean();
    if (!location) throw new NotFoundException('Location not found');
    const plant = await this.db.plant.findById(location.plantId).lean();
    if (!plant) throw new NotFoundException('Plant not found');
    const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const locationIds = await this.db.location.find({}).select({ _id: 1, plantId: 1 }).lean();
    const plantIds = await this.db.plant.find({}).select({ _id: 1, businessUnitId: 1 }).lean();
    const businessUnitIds = await this.db.businessUnit.find({}).select({ _id: 1, companyId: 1 }).lean();
    const companyIds = await this.db.company.find({ tenantId: auth.tenantId }).select({ _id: 1 }).lean();
    const tenantCompanyIds = new Set(companyIds.map((c: any) => String(c._id)));
    const tenantBusinessUnitIds = new Set(businessUnitIds.filter((b: any) => tenantCompanyIds.has(String(b.companyId))).map((b: any) => String(b._id)));
    const tenantPlantIds = new Set(plantIds.filter((p: any) => tenantBusinessUnitIds.has(String(p.businessUnitId))).map((p: any) => String(p._id)));
    const tenantLocationIds = locationIds.filter((l: any) => tenantPlantIds.has(String(l.plantId))).map((l: any) => String(l._id));
    const count = tenantLocationIds.length ? await this.db.department.countDocuments({ locationId: { $in: tenantLocationIds } }) : 0;
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_departments', count);
    const doc = await this.db.department.create({ locationId, name });
    return toDto(doc.toObject());
  }

  private async assertCompanyInScope(auth: AuthContext, companyId: string) {
    if (!auth.crossCompany && auth.companyId !== companyId) {
      throw new ForbiddenException('Company out of scope for this user');
    }
  }
}
