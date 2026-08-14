import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TENANT_ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';

export interface AuthContext {
  userId: string;
  sessionId: string;
  tenantId: string;
  companyId: string;
  crossCompany: boolean;
  permissions: string[];
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : readCookie(req, TENANT_ACCESS_COOKIE);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.jwt.verify(token);
      if (!payload.sub || !payload.sessionId || !payload.tenantId || !payload.companyId) throw new UnauthorizedException('Invalid access token claims');
      req.authContext = {
        userId: payload.sub,
        sessionId: payload.sessionId,
        tenantId: payload.tenantId,
        companyId: payload.companyId,
        crossCompany: !!payload.crossCompany,
        permissions: payload.permissions ?? [],
      } as AuthContext;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
