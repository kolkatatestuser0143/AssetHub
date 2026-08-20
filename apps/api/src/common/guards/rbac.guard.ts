import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthContext } from './tenant-context.guard';
import { PrismaService } from '../database/prisma.service';

/**
 * Server-side permission enforcement. Permissions are resolved from the
 * current PostgreSQL role assignments so role changes take effect without
 * waiting for an access token to expire. Identity providers never grant
 * AssetHub permissions or scopes.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const authContext: AuthContext | undefined = req.authContext;
    if (!authContext) throw new ForbiddenException('No auth context resolved');

    if (authContext.permissions.includes(required)) return true;

    const user = await this.db.user.findFirst({
      where: { id: authContext.userId, tenantId: authContext.tenantId },
      select: { roleIds: true, companyId: true },
    });

    if (!user?.roleIds?.length) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }

    const roles = await this.db.$queryRawUnsafe<any[]>(
      `SELECT r.id, r.company_id AS "companyId", p.key AS "permissionKey"
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE r.tenant_id = $1::uuid
         AND r.id = ANY($2::uuid[])
         AND (r.company_id IS NULL OR r.company_id = $3::uuid)`,
      authContext.tenantId,
      user.roleIds,
      user.companyId,
    );

    const permissions = new Set<string>(authContext.permissions ?? []);
    let crossCompany = authContext.crossCompany;
    for (const role of roles) {
      if (role.companyId == null) crossCompany = true;
      if (role.permissionKey) permissions.add(String(role.permissionKey));
    }

    authContext.permissions = [...permissions];
    authContext.crossCompany = crossCompany;
    req.authContext = authContext;

    if (!permissions.has(required)) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }
    return true;
  }
}
