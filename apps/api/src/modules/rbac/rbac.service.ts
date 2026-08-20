import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';

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
        COALESCE(json_agg(json_build_object('permissionId', p.id, 'permissionKey', p.key)) FILTER (WHERE p.id IS NOT NULL), '[]') AS permissions
       FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id
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
}
