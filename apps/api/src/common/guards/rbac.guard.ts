import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthContext } from './tenant-context.guard';
import { MongooseDatabaseService } from '../mongoose-database.service';

/**
 * Server-side permission enforcement. JWT permissions are useful for fast
 * authorization, but role changes must take effect without waiting for an
 * old access token to expire. When the token does not contain the required
 * permission, resolve the user's current tenant roles from MongoDB.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: MongooseDatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const authContext: AuthContext | undefined = req.authContext;
    if (!authContext) throw new ForbiddenException('No auth context resolved');

    if (authContext.permissions.includes(required)) return true;

    const user = await this.db.user.findOne({
      _id: authContext.userId,
      tenantId: authContext.tenantId,
    }).select({ roleIds: 1, companyId: 1 }).lean();

    if (!user?.roleIds?.length) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }

    const roles = await this.db.role.find({
      _id: { $in: user.roleIds },
      tenantId: authContext.tenantId,
      $or: [{ companyId: String(user.companyId) }, { companyId: null }, { companyId: { $exists: false } }],
    }).select({ permissions: 1, companyId: 1 }).lean();

    const permissions = new Set<string>(authContext.permissions);
    let crossCompany = authContext.crossCompany;
    for (const role of roles as any[]) {
      if (role.companyId == null) crossCompany = true;
      for (const permission of role.permissions ?? []) {
        if (permission?.permissionKey) permissions.add(String(permission.permissionKey));
      }
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
