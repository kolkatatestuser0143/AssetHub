import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthContext } from './tenant-context.guard';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!required) return true;
    const req = context.switchToHttp().getRequest();
    const authContext: AuthContext | undefined = req.authContext;
    if (!authContext) throw new ForbiddenException('No auth context resolved');

    const user = await this.db.user.findFirst({ where: { id: authContext.userId, tenantId: authContext.tenantId }, select: { roleIds: true, companyId: true } });
    if (!user?.roleIds?.length) throw new ForbiddenException(`Missing permission: ${required}`);

    const roles = await this.db.$queryRawUnsafe<any[]>(
      `SELECT r.id, r.company_id AS "companyId", p.key AS "permissionKey",
              rs.scope_type AS "scopeType", rs.company_id AS "scopeCompanyId", rs.location_id AS "scopeLocationId"
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       LEFT JOIN role_scopes rs ON rs.role_id = r.id
       WHERE r.tenant_id = $1::uuid AND r.id = ANY($2::uuid[])
         AND (r.company_id IS NULL OR r.company_id = $3::uuid)`,
      authContext.tenantId, user.roleIds, user.companyId,
    );

    const permissions = new Set<string>(authContext.permissions ?? []);
    const companyIds = new Set<string>(authContext.allowedCompanyIds ?? []);
    const locationIds = new Set<string>(authContext.allowedLocationIds ?? []);
    let crossCompany = authContext.crossCompany;

    for (const role of roles) {
      if (role.permissionKey) permissions.add(String(role.permissionKey));
      if (role.scopeType === 'TENANT' || (role.scopeType == null && role.companyId == null)) crossCompany = true;
      if (role.scopeCompanyId) companyIds.add(String(role.scopeCompanyId));
      if (role.scopeLocationId) locationIds.add(String(role.scopeLocationId));
      if (role.scopeType == null && role.companyId) companyIds.add(String(role.companyId));
    }

    if (crossCompany) companyIds.clear();
    authContext.permissions = [...permissions];
    authContext.crossCompany = crossCompany;
    authContext.allowedCompanyIds = [...companyIds];
    authContext.allowedLocationIds = [...locationIds];
    req.authContext = authContext;

    if (!permissions.has(required)) throw new ForbiddenException(`Missing permission: ${required}`);
    return true;
  }
}
