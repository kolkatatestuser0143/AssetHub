import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthContext {
  userId: string;
  sessionId: string;
  tenantId: string;
  companyId: string;
  crossCompany: boolean; // tenant-admin widened scope
  permissions: string[];
}

/**
 * Runs before every guarded route. Decodes the access token, and attaches
 * `req.authContext`. This is step 1 of the defense-in-depth chain
 * (architecture doc §5) — RbacGuard and the repository layer both depend
 * on req.authContext being present and trustworthy.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = this.jwt.verify(authHeader.slice(7));
      if (!payload.sub || !payload.sessionId || !payload.tenantId || !payload.companyId) {
        throw new UnauthorizedException('Invalid access token claims');
      }

      const authContext: AuthContext = {
        userId: payload.sub,
        sessionId: payload.sessionId,
        tenantId: payload.tenantId,
        companyId: payload.companyId,
        crossCompany: !!payload.crossCompany,
        permissions: payload.permissions ?? [],
      };
      req.authContext = authContext;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
