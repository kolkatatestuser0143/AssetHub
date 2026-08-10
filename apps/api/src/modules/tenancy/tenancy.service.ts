import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

@Injectable()
export class TenancyService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) {
    super();
  }

  async listCompanies(auth: AuthContext) {
    // Only tenant admins (crossCompany) see all companies in the tenant;
    // everyone else sees only their own (architecture doc §5).
    const docs = await this.db.company.find(this.scope(auth)).lean();
    return toDtoArray(docs);
  }

  async createCompany(auth: AuthContext, name: string, code: string) {
    const doc = await this.db.company.create({
      tenantId: auth.tenantId,
      name,
      code,
    });
    return toDto(doc.toObject());
  }

  async createBusinessUnit(auth: AuthContext, companyId: string, name: string) {
    await this.assertCompanyInScope(auth, companyId);
    const doc = await this.db.businessUnit.create({ companyId, name });
    return toDto(doc.toObject());
  }

  async createPlant(auth: AuthContext, businessUnitId: string, name: string) {
    const bu = await this.db.businessUnit.findById(businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const doc = await this.db.plant.create({ businessUnitId, name });
    return toDto(doc.toObject());
  }

  async createLocation(auth: AuthContext, plantId: string, name: string) {
    const plant = await this.db.plant.findById(plantId).lean();
    if (!plant) throw new NotFoundException('Plant not found');
    const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const doc = await this.db.location.create({ plantId, name });
    return toDto(doc.toObject());
  }

  async createDepartment(auth: AuthContext, locationId: string, name: string) {
    const location = await this.db.location.findById(locationId).lean();
    if (!location) throw new NotFoundException('Location not found');
    const plant = await this.db.plant.findById(location.plantId).lean();
    if (!plant) throw new NotFoundException('Plant not found');
    const bu = await this.db.businessUnit.findById(plant.businessUnitId).lean();
    if (!bu) throw new NotFoundException('BusinessUnit not found');
    await this.assertCompanyInScope(auth, bu.companyId);
    const doc = await this.db.department.create({ locationId, name });
    return toDto(doc.toObject());
  }

  // Belt-and-braces: even though the eventual write is scoped by the
  // parent's companyId, we explicitly re-verify the caller's auth
  // context actually covers that company before allowing the write —
  // this is what stops "swap the ID in the request body" attacks
  // (master prompt §3) at the service layer. MongoDB has no RLS, so
  // this app-level check IS the isolation — never weaken it.
  private async assertCompanyInScope(auth: AuthContext, companyId: string) {
    if (!auth.crossCompany && auth.companyId !== companyId) {
      throw new ForbiddenException('Company out of scope for this user');
    }
  }
}
