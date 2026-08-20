import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';

export type RoleScopeInput = { scopeType: 'TENANT' | 'COMPANY' | 'LOCATION'; companyId?: string; locationId?: string };

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementService) {}

  async listPermissions() {
    return this.prisma.$queryRawUnsafe('SELECT id, key, name, description FROM permissions ORDER BY key ASC');
  }

  async listRoles(auth: AuthContext) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const company = auth.crossCompany ? null : auth.companyId;
    return this.prisma.$queryRawUnsafe(
      `SELECT r.id, r.tenant_id AS "tenantId", r.company_id AS "companyId", r.name, r.is_system AS "isSystem",
        COALESCE(json_agg(DISTINCT jsonb_build_object('permissionId', p.id, 'permissionKey', p.key)) FILTER (WHERE p.id IS NOT NULL), '[]') AS permissions,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', rs.id, 'scopeType', rs.scope_type, 'companyId', rs.company_id, 'locationId', rs.location_id)) FILTER (WHERE rs.id IS NOT NULL), '[]') AS scopes
       FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id
       LEFT JOIN role_scopes rs ON rs.role_id = r.id
       WHERE r.tenant_id = $1::uuid AND ($2::uuid IS NULL OR r.company_id = $2::uuid OR r.company_id IS NULL)
       GROUP BY r.id ORDER BY r.name ASC`, auth.tenantId, company);
  }

  async createRole(auth: AuthContext, name: string, permissionKeys: string[]) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const company = auth.crossCompany ? null : auth.companyId;
    return this.prisma.$transaction(async tx => {
      const role = await tx.$queryRawUnsafe<any[]>(`INSERT INTO roles (tenant_id, company_id, name, is_system) VALUES ($1::uuid,$2::uuid,$3,false) RETURNING id, tenant_id AS "tenantId", company_id AS "companyId", name, is_system AS "isSystem"`, auth.tenantId, company, name);
      if (!role[0]) throw new Error('Failed to create role');
      for (const key of permissionKeys) await tx.$executeRawUnsafe(`INSERT INTO role_permissions (role_id, permission_id) SELECT $1::uuid, id FROM permissions WHERE key = $2 ON CONFLICT DO NOTHING`, role[0].id, key);
      return role[0];
    });
  }

  async assignRole(auth: AuthContext, userId: string, roleId: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const role = await this.prisma.$queryRawUnsafe<any[]>(`SELECT id, company_id AS "companyId" FROM roles WHERE id=$1::uuid AND tenant_id=$2::uuid AND ($3::uuid IS NULL OR company_id=$3::uuid OR company_id IS NULL)`, roleId, auth.tenantId, auth.crossCompany ? null : auth.companyId);
    if (!role[0]) throw new NotFoundException('Role not found in your scope');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }), accountType: 'TENANT' } });
    if (!user) throw new NotFoundException('User not found in your scope');
    if (role[0].companyId && role[0].companyId !== user.companyId) throw new ForbiddenException('Role belongs to a different company');
    const ids = new Set(user.roleIds); if (ids.has(roleId)) throw new Error('Role already assigned'); ids.add(roleId);
    return this.prisma.user.update({ where: { id: userId }, data: { roleIds: [...ids], authVersion: { increment: 1 } } });
  }

  async unassignRole(auth: AuthContext, userId: string, roleId: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const role = await this.prisma.$queryRawUnsafe<any[]>(`SELECT id, company_id AS "companyId" FROM roles WHERE id=$1::uuid AND tenant_id=$2::uuid AND ($3::uuid IS NULL OR company_id=$3::uuid OR company_id IS NULL)`, roleId, auth.tenantId, auth.crossCompany ? null : auth.companyId);
    if (!role[0]) throw new NotFoundException('Role not found in your scope');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }), accountType: 'TENANT' } });
    if (!user) throw new NotFoundException('User not found in your scope');
    if (role[0].companyId && role[0].companyId !== user.companyId) throw new ForbiddenException('Role belongs to a different company');
    const ids = user.roleIds.filter(id => id !== roleId); if (ids.length === user.roleIds.length) throw new Error('Role is not assigned to this user');
    return this.prisma.user.update({ where: { id: userId }, data: { roleIds: ids, authVersion: { increment: 1 } } });
  }

  async listRoleScopes(auth: AuthContext, roleId: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const role = await this.prisma.$queryRawUnsafe<any[]>(`SELECT id, company_id AS "companyId" FROM roles WHERE id=$1::uuid AND tenant_id=$2::uuid AND ($3::uuid IS NULL OR company_id=$3::uuid OR company_id IS NULL)`, roleId, auth.tenantId, auth.crossCompany ? null : auth.companyId);
    if (!role[0]) throw new NotFoundException('Role not found in your scope');
    return this.prisma.$queryRawUnsafe(`SELECT id, scope_type AS "scopeType", company_id AS "companyId", location_id AS "locationId" FROM role_scopes WHERE role_id=$1::uuid ORDER BY scope_type, company_id, location_id`, roleId);
  }

  async setRoleScopes(auth: AuthContext, roleId: string, scopes: RoleScopeInput[]) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const role = await this.prisma.$queryRawUnsafe<any[]>(`SELECT id, company_id AS "companyId" FROM roles WHERE id=$1::uuid AND tenant_id=$2::uuid AND ($3::uuid IS NULL OR company_id=$3::uuid OR company_id IS NULL)`, roleId, auth.tenantId, auth.crossCompany ? null : auth.companyId);
    if (!role[0]) throw new NotFoundException('Role not found in your scope');

    for (const scope of scopes) {
      if (scope.scopeType === 'TENANT') continue;
      if (scope.scopeType === 'COMPANY') {
        if (!scope.companyId) throw new ForbiddenException('Company scope requires companyId');
        const company = await this.prisma.company.findFirst({ where: { id: scope.companyId, tenantId: auth.tenantId } });
        if (!company) throw new NotFoundException('Company scope not found');
      }
      if (scope.scopeType === 'LOCATION') {
        if (!scope.locationId) throw new ForbiddenException('Location scope requires locationId');
        const location = await this.prisma.location.findFirst({ where: { id: scope.locationId, site: { tenantId: auth.tenantId } }, include: { site: { select: { companyId: true } } } });
        if (!location) throw new NotFoundException('Location scope not found');
        if (scope.companyId && scope.companyId !== location.site.companyId) throw new ForbiddenException('Location does not belong to the supplied company');
      }
    }

    await this.prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`DELETE FROM role_scopes WHERE role_id=$1::uuid`, roleId);
      for (const scope of scopes) {
        await tx.$executeRawUnsafe(`INSERT INTO role_scopes (role_id, tenant_id, company_id, location_id, scope_type) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5) ON CONFLICT DO NOTHING`, roleId, auth.tenantId, scope.companyId ?? null, scope.locationId ?? null, scope.scopeType);
      }
    });
    return this.listRoleScopes(auth, roleId);
  }
}
