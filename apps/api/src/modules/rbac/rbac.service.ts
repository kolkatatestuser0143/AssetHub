import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';

export type RoleScopeInput = { scopeType: 'TENANT' | 'COMPANY' | 'LOCATION'; companyId?: string; locationId?: string };

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementService) {}
  private validatePermissionKeys(keys: string[]) { const invalid = [...new Set(keys.filter(k => String(k).startsWith('platform:')))]; if (invalid.length) throw new ForbiddenException('Platform permissions cannot be assigned to tenant roles'); }

  async listPermissions() { return this.prisma.$queryRawUnsafe(`SELECT id, key, name, description FROM permissions WHERE key NOT LIKE 'platform:%' ORDER BY key ASC`); }

  async listRoles(auth: AuthContext) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    const company = auth.crossCompany ? null : auth.companyId;
    return this.prisma.$queryRawUnsafe(`SELECT r.id, r.tenant_id AS "tenantId", r.company_id AS "companyId", r.name, r.is_system AS "isSystem",
      COALESCE(json_agg(DISTINCT jsonb_build_object('permissionId', p.id, 'permissionKey', p.key)) FILTER (WHERE p.id IS NOT NULL AND p.key NOT LIKE 'platform:%'), '[]') AS permissions,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', rs.id, 'scopeType', rs.scope_type, 'companyId', rs.company_id, 'locationId', rs.location_id)) FILTER (WHERE rs.id IS NOT NULL), '[]') AS scopes
      FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id LEFT JOIN role_scopes rs ON rs.role_id=r.id
      WHERE r.tenant_id=$1::uuid AND ($2::uuid IS NULL OR r.company_id=$2::uuid OR r.company_id IS NULL)
      AND NOT EXISTS (SELECT 1 FROM role_permissions rpx INNER JOIN permissions px ON px.id=rpx.permission_id WHERE rpx.role_id=r.id AND px.key LIKE 'platform:%')
      GROUP BY r.id ORDER BY r.name ASC`, auth.tenantId, company);
  }

  private async savePermissions(tx: any, roleId: string, permissionKeys: string[]) {
    this.validatePermissionKeys(permissionKeys);
    const uniqueKeys=[...new Set(permissionKeys.map(k=>String(k).trim()).filter(Boolean))];
    const known:any[]=await tx.$queryRawUnsafe(`SELECT key FROM permissions WHERE key = ANY($1::text[]) AND key NOT LIKE 'platform:%'`, uniqueKeys);
    if (known.length !== uniqueKeys.length) throw new NotFoundException('One or more permissions are not available to tenant roles');
    await tx.$executeRawUnsafe(`DELETE FROM role_permissions WHERE role_id=$1::uuid`, roleId);
    for (const key of uniqueKeys) await tx.$executeRawUnsafe(`INSERT INTO role_permissions(role_id,permission_id) SELECT $1::uuid,id FROM permissions WHERE key=$2 ON CONFLICT DO NOTHING`, roleId, key);
  }

  async createRole(auth: AuthContext, name: string, permissionKeys: string[]) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    this.validatePermissionKeys(permissionKeys);
    const cleanName=name.trim(); if(!cleanName) throw new ConflictException('Role name is required');
    const company=auth.crossCompany?null:auth.companyId;
    return this.prisma.$transaction(async tx=>{
      const dup:any[]=await tx.$queryRawUnsafe(`SELECT id FROM roles WHERE tenant_id=$1::uuid AND company_id IS NOT DISTINCT FROM $2::uuid AND lower(name)=lower($3) LIMIT 1`,auth.tenantId,company,cleanName);
      if(dup[0]) throw new ConflictException('A role with this name already exists in this scope');
      const role:any[]=await tx.$queryRawUnsafe(`INSERT INTO roles(tenant_id,company_id,name,is_system) VALUES($1::uuid,$2::uuid,$3,false) RETURNING id,tenant_id AS "tenantId",company_id AS "companyId",name,is_system AS "isSystem"`,auth.tenantId,company,cleanName);
      await this.savePermissions(tx,role[0].id,permissionKeys); return role[0];
    });
  }

  async updateRole(auth: AuthContext, roleId: string, name: string, permissionKeys: string[]) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_roles_enabled');
    this.validatePermissionKeys(permissionKeys);
    const role=await this.findTenantRole(auth,roleId); if(!role) throw new NotFoundException('Role not found in your scope');
    const cleanName=name.trim(); if(!cleanName) throw new ConflictException('Role name is required');
    const unique=[...new Set(permissionKeys.map(k=>String(k).trim()).filter(Boolean))];
    if(cleanName.toLowerCase()==='tenant admin') {
      const required=['role:read','role:write','user:read','user:write','company:read','company:write'];
      if(required.some(k=>!unique.includes(k))) throw new ForbiddenException('Tenant Admin must retain core tenant-administration permissions');
    }
    return this.prisma.$transaction(async tx=>{
      const dup:any[]=await tx.$queryRawUnsafe(`SELECT id FROM roles WHERE tenant_id=$1::uuid AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM roles WHERE id=$2::uuid) AND lower(name)=lower($3) AND id<>$2::uuid LIMIT 1`,auth.tenantId,roleId,cleanName);
      if(dup[0]) throw new ConflictException('A role with this name already exists in this scope');
      await tx.$executeRawUnsafe(`UPDATE roles SET name=$2,updated_at=now() WHERE id=$1::uuid`,roleId,cleanName);
      await this.savePermissions(tx,roleId,unique);
      await tx.$executeRawUnsafe(`UPDATE users SET auth_version=auth_version+1 WHERE tenant_id=$1::uuid AND $2::uuid = ANY(role_ids)`,auth.tenantId,roleId);
      return { id: roleId, name: cleanName, isSystem: role.isSystem };
    });
  }

  private async findTenantRole(auth: AuthContext, roleId: string) {
    const rows=await this.prisma.$queryRawUnsafe<any[]>(`SELECT r.id,r.company_id AS "companyId",r.is_system AS "isSystem" FROM roles r WHERE r.id=$1::uuid AND r.tenant_id=$2::uuid AND ($3::uuid IS NULL OR r.company_id=$3::uuid OR r.company_id IS NULL) AND NOT EXISTS (SELECT 1 FROM role_permissions rp INNER JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.key LIKE 'platform:%')`,roleId,auth.tenantId,auth.crossCompany?null:auth.companyId); return rows[0];
  }

  async assignRole(auth: AuthContext,userId:string,roleId:string){await this.entitlements.requireFeature(auth.tenantId,'custom_roles_enabled');const role=await this.findTenantRole(auth,roleId);if(!role)throw new NotFoundException('Role not found in your scope');const user=await this.prisma.user.findFirst({where:{id:userId,tenantId:auth.tenantId,...(auth.crossCompany?{}:{companyId:auth.companyId}),accountType:'TENANT'}});if(!user)throw new NotFoundException('User not found in your scope');if(role.companyId&&role.companyId!==user.companyId)throw new ForbiddenException('Role belongs to a different company');const ids=new Set(user.roleIds);if(ids.has(roleId))throw new ConflictException('Role already assigned');ids.add(roleId);return this.prisma.user.update({where:{id:userId},data:{roleIds:[...ids],authVersion:{increment:1}}});}
  async unassignRole(auth:AuthContext,userId:string,roleId:string){await this.entitlements.requireFeature(auth.tenantId,'custom_roles_enabled');const role=await this.findTenantRole(auth,roleId);if(!role)throw new NotFoundException('Role not found in your scope');const user=await this.prisma.user.findFirst({where:{id:userId,tenantId:auth.tenantId,...(auth.crossCompany?{}:{companyId:auth.companyId}),accountType:'TENANT'}});if(!user)throw new NotFoundException('User not found in your scope');if(role.companyId&&role.companyId!==user.companyId)throw new ForbiddenException('Role belongs to a different company');const ids=user.roleIds.filter(id=>id!==roleId);if(ids.length===user.roleIds.length)throw new ConflictException('Role is not assigned to this user');if(role.isSystem&&roleId&&ids.length===0&&user.adminLevel==='TENANT_ADMIN')throw new ForbiddenException('Tenant Admin must retain at least one role');return this.prisma.user.update({where:{id:userId},data:{roleIds:ids,authVersion:{increment:1}}});}
  async listRoleScopes(auth:AuthContext,roleId:string){await this.entitlements.requireFeature(auth.tenantId,'custom_roles_enabled');const role=await this.findTenantRole(auth,roleId);if(!role)throw new NotFoundException('Role not found in your scope');return this.prisma.$queryRawUnsafe(`SELECT id,scope_type AS "scopeType",company_id AS "companyId",location_id AS "locationId" FROM role_scopes WHERE role_id=$1::uuid ORDER BY scope_type,company_id,location_id`,roleId);}
  async setRoleScopes(auth:AuthContext,roleId:string,scopes:RoleScopeInput[]){await this.entitlements.requireFeature(auth.tenantId,'custom_roles_enabled');const role=await this.findTenantRole(auth,roleId);if(!role)throw new NotFoundException('Role not found in your scope');for(const scope of scopes){if(scope.scopeType==='TENANT')continue;if(scope.scopeType==='COMPANY'){if(!scope.companyId)throw new ForbiddenException('Company scope requires companyId');const company=await this.prisma.company.findFirst({where:{id:scope.companyId,tenantId:auth.tenantId}});if(!company)throw new NotFoundException('Company scope not found');}if(scope.scopeType==='LOCATION'){if(!scope.locationId)throw new ForbiddenException('Location scope requires locationId');const location=await this.prisma.location.findFirst({where:{id:scope.locationId,site:{tenantId:auth.tenantId}},include:{site:{select:{companyId:true}}}});if(!location)throw new NotFoundException('Location scope not found');if(scope.companyId&&scope.companyId!==location.site.companyId)throw new ForbiddenException('Location does not belong to the supplied company');}}
    await this.prisma.$transaction(async tx=>{await tx.$executeRawUnsafe(`DELETE FROM role_scopes WHERE role_id=$1::uuid`,roleId);for(const scope of scopes)await tx.$executeRawUnsafe(`INSERT INTO role_scopes(role_id,tenant_id,company_id,location_id,scope_type) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5) ON CONFLICT DO NOTHING`,roleId,auth.tenantId,scope.companyId??null,scope.locationId??null,scope.scopeType);});return this.listRoleScopes(auth,roleId);}
}
