import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';

@Injectable()
export class TenancyService extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async listCompanies(auth: AuthContext) {
    // Only tenant admins (crossCompany) see all companies in the tenant;
    // everyone else sees only their own (architecture doc §5).
    return this.prisma.company.findMany({ where: this.scope(auth) });
  }

  async createCompany(auth: AuthContext, name: string, code: string) {
    return this.prisma.company.create({
      data: { tenantId: auth.tenantId, name, code },
    });
  }

  async createBusinessUnit(auth: AuthContext, companyId: string, name: string) {
    await this.assertCompanyInScope(auth, companyId);
    return this.prisma.businessUnit.create({ data: { companyId, name } });
  }

  async createPlant(auth: AuthContext, businessUnitId: string, name: string) {
    const bu = await this.prisma.businessUnit.findUniqueOrThrow({ where: { id: businessUnitId } });
    await this.assertCompanyInScope(auth, bu.companyId);
    return this.prisma.plant.create({ data: { businessUnitId, name } });
  }

  async createLocation(auth: AuthContext, plantId: string, name: string) {
    const plant = await this.prisma.plant.findUniqueOrThrow({
      where: { id: plantId },
      include: { businessUnit: true },
    });
    await this.assertCompanyInScope(auth, plant.businessUnit.companyId);
    return this.prisma.location.create({ data: { plantId, name } });
  }

  async createDepartment(auth: AuthContext, locationId: string, name: string) {
    const location = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      include: { plant: { include: { businessUnit: true } } },
    });
    await this.assertCompanyInScope(auth, location.plant.businessUnit.companyId);
    return this.prisma.department.create({ data: { locationId, name } });
  }

  // Belt-and-braces: even though the eventual write is scoped by the
  // parent's companyId, we explicitly re-verify the caller's auth
  // context actually covers that company before allowing the write —
  // this is what stops "swap the ID in the request body" attacks
  // (master prompt §3) at the service layer, ahead of RLS.
  private async assertCompanyInScope(auth: AuthContext, companyId: string) {
    if (!auth.crossCompany && auth.companyId !== companyId) {
      throw new ForbiddenException('Company out of scope for this user');
    }
  }
}
