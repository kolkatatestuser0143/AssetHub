import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';
type SiteType = 'plant'|'branch_office'|'head_office'|'other';

@Injectable()
export class TenancyService {
  constructor(private readonly db: PrismaService, private readonly entitlements: EntitlementService) {}

  private scopedCompanyId(auth: AuthContext): string | null { return auth.tenantWide ? null : (auth.scopeCompanyId ?? auth.companyId); }

  async getTenantProfile(auth: AuthContext) {
    const tenant = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.tenant.findUnique({ where: { id: auth.tenantId } }));
    if (!tenant) throw new NotFoundException('Tenant not found');
    const company = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.company.findFirst({ where: { id: auth.companyId, tenantId: auth.tenantId } }));
    return { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status, primaryEmail: tenant.primaryEmail ?? null, phone: tenant.phone ?? null, website: tenant.website ?? null, logoFileId: tenant.logoFileId ?? null, logoUrl: tenant.logoUrl ?? null, company: company ? { id: company.id, name: company.name, code: company.code } : null };
  }

  async updateTenantProfile(auth: AuthContext, input: { name?: string; phone?: string; website?: string; logoFileId?: string; logoUrl?: string }) {
    const tenant = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.tenant.findUnique({ where: { id: auth.tenantId } }));
    if (!tenant) throw new NotFoundException('Tenant not found');
    const data: Record<string, string | null> = {};
    for (const key of ['name', 'phone', 'website', 'logoFileId', 'logoUrl'] as const) {
      const value = input[key];
      if (value !== undefined) data[key] = typeof value === 'string' ? value.trim() : value;
    }
    // Tenant branding belongs to the Tenant. It must not silently rename a Company.
    const updated = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.tenant.update({ where: { id: auth.tenantId }, data }));
    return { id: updated.id, name: updated.name, slug: updated.slug, status: updated.status, primaryEmail: updated.primaryEmail ?? null, phone: updated.phone ?? null, website: updated.website ?? null, logoFileId: updated.logoFileId ?? null, logoUrl: updated.logoUrl ?? null };
  }

  async listCompanies(auth: AuthContext) {
    const where = auth.tenantWide ? { tenantId: auth.tenantId } : { tenantId: auth.tenantId, id: auth.scopeCompanyId ?? auth.companyId };
    return this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.company.findMany({ where, orderBy: { name: 'asc' } }));
  }

  async getAssetHierarchy(auth: AuthContext) {
    const companyWhere = auth.tenantWide ? { tenantId: auth.tenantId } : { tenantId: auth.tenantId, id: auth.scopeCompanyId ?? auth.companyId };
    const siteWhere = auth.tenantWide ? { tenantId: auth.tenantId } : { tenantId: auth.tenantId, companyId: auth.scopeCompanyId ?? auth.companyId };
    return this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), async tx => {
      const companies = await tx.company.findMany({ where: companyWhere, orderBy: { name: 'asc' } });
      const sites = await tx.site.findMany({ where: siteWhere, orderBy: [{ type: 'asc' }, { name: 'asc' }], include: { locations: { orderBy: { name: 'asc' }, include: { departments: { orderBy: { name: 'asc' } } } } } });
      return companies.map(c => ({ ...c, sites: sites.filter(s => s.companyId === c.id) }));
    });
  }

  async createCompany(auth: AuthContext, name: string, code: string) {
    if (!auth.tenantWide) throw new ForbiddenException('Only tenant-wide administrators can create companies');
    const normalizedName = name.trim(), normalizedCode = code.trim().toUpperCase();
    if (!normalizedName) throw new ConflictException('Company name is required');
    if (!normalizedCode) throw new ConflictException('Company code is required');
    return this.db.withTenantContext(auth.tenantId, null, async tx => {
      if (await tx.company.findUnique({ where: { tenantId_code: { tenantId: auth.tenantId, code: normalizedCode } } })) throw new ConflictException(`Company code '${normalizedCode}' is already in use in this tenant`);
      const count = await tx.company.count({ where: { tenantId: auth.tenantId } });
      await this.entitlements.requireWithinLimit(auth.tenantId, 'max_companies', count, 1);
      return tx.company.create({ data: { tenantId: auth.tenantId, name: normalizedName, code: normalizedCode } });
    });
  }

  private async assertCompanyAccess(auth: AuthContext, companyId: string) {
    if (auth.tenantWide) {
      const company = await this.db.withTenantContext(auth.tenantId, null, tx => tx.company.findFirst({ where: { id: companyId, tenantId: auth.tenantId }, select: { id: true } }));
      if (!company) throw new NotFoundException('Company not found');
      return;
    }
    const allowedCompanyId = auth.scopeCompanyId ?? auth.companyId;
    if (companyId !== allowedCompanyId) throw new ForbiddenException('Company out of scope for this user');
    const company = await this.db.withTenantContext(auth.tenantId, allowedCompanyId, tx => tx.company.findFirst({ where: { id: companyId, tenantId: auth.tenantId }, select: { id: true } }));
    if (!company) throw new NotFoundException('Company not found');
  }

  async listPlants(auth: AuthContext, companyId: string) {
    await this.assertCompanyAccess(auth, companyId);
    return this.db.withTenantContext(auth.tenantId, auth.tenantWide ? null : companyId, tx => tx.site.findMany({ where: { companyId, tenantId: auth.tenantId }, orderBy: [{ type: 'asc' }, { name: 'asc' }] }));
  }

  async createPlant(auth: AuthContext, companyId: string, name: string, type: SiteType = 'plant') {
    await this.assertCompanyAccess(auth, companyId);
    const normalizedName = name.trim();
    if (!normalizedName) throw new ConflictException('Site name is required');
    const siteType = ['plant', 'branch_office', 'head_office', 'other'].includes(type) ? type : 'plant';
    return this.db.withTenantContext(auth.tenantId, auth.tenantWide ? null : companyId, async tx => {
      const siteCount = await tx.site.count({ where: { companyId } });
      await this.entitlements.requireWithinLimit(auth.tenantId, 'max_sites', siteCount, 1);
      return tx.site.create({ data: { tenantId: auth.tenantId, companyId, name: normalizedName, type: siteType } });
    });
  }

  async listLocations(auth: AuthContext, siteId: string) {
    const site = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.site.findUnique({ where: { id: siteId }, select: { id: true, companyId: true, tenantId: true } }));
    if (!site) throw new NotFoundException('Site not found');
    await this.assertCompanyAccess(auth, site.companyId);
    return this.db.withTenantContext(auth.tenantId, auth.tenantWide ? null : site.companyId, tx => tx.location.findMany({ where: { siteId }, orderBy: { name: 'asc' } }));
  }

  async createLocation(auth: AuthContext, siteId: string, name: string) {
    const site = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.site.findUnique({ where: { id: siteId }, select: { id: true, companyId: true, tenantId: true } }));
    if (!site) throw new NotFoundException('Site not found');
    await this.assertCompanyAccess(auth, site.companyId);
    const normalizedName = name.trim();
    if (!normalizedName) throw new ConflictException('Location name is required');
    return this.db.withTenantContext(auth.tenantId, auth.tenantWide ? null : site.companyId, async tx => {
      const count = await tx.location.count({ where: { site: { companyId: site.companyId } } });
      await this.entitlements.requireWithinLimit(auth.tenantId, 'max_locations', count, 1);
      return tx.location.create({ data: { siteId, name: normalizedName } });
    });
  }

  async listDepartments(auth: AuthContext, locationId: string) {
    const location = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.location.findUnique({ where: { id: locationId }, include: { site: { select: { companyId: true, tenantId: true } } } }));
    if (!location) throw new NotFoundException('Location not found');
    await this.assertCompanyAccess(auth, location.site.companyId);
    return this.db.withTenantContext(auth.tenantId, auth.tenantWide ? null : location.site.companyId, tx => tx.department.findMany({ where: { locationId }, orderBy: { name: 'asc' } }));
  }

  async createDepartment(auth: AuthContext, locationId: string, name: string) {
    const location = await this.db.withTenantContext(auth.tenantId, this.scopedCompanyId(auth), tx => tx.location.findUnique({ where: { id: locationId }, include: { site: { select: { companyId: true, tenantId: true } } } }));
    if (!location) throw new NotFoundException('Location not found');
    await this.assertCompanyAccess(auth, location.site.companyId);
    const normalizedName = name.trim();
    if (!normalizedName) throw new ConflictException('Department name is required');
    return this.db.withTenantContext(auth.tenantId, auth.tenantWide ? null : location.site.companyId, async tx => {
      const count = await tx.department.count({ where: { location: { site: { companyId: location.site.companyId } } } });
      await this.entitlements.requireWithinLimit(auth.tenantId, 'max_departments', count, 1);
      return tx.department.create({ data: { locationId, name: normalizedName } });
    });
  }
}
