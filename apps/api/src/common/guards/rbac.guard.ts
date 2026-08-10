import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthContext } from './tenant-context.guard';

/**
 * Runs AFTER TenantContextGuard. Re-checks permission server-side on
 * every mutating route — the frontend hides UI for UX only, this is the
 * actual enforcement (architecture doc §6, master prompt §3/§67:
 * "authorization only in frontend" is an explicit anti-pattern to avoid).
 *
 * Platform-admin permissions live in a separate namespace
 * (platform:*) and are never satisfied by a tenant-scoped role —
 * enforced simply by the fact platform:* permissions are only ever
 * granted to platform-admin accounts, never seeded into tenant roles.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!required) return true; // route opted out of permission checks explicitly

    const req = context.switchToHttp().getRequest();
    const authContext: AuthContext | undefined = req.authContext;
    if (!authContext) {
      throw new ForbiddenException('No auth context resolved');
    }

    if (!authContext.permissions.includes(required)) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }
    return true;
  }
}
