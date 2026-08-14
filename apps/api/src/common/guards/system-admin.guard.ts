import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : readCookie(req, ACCESS_COOKIE);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.jwt.verify(token);
      if (!payload.systemAdmin) throw new ForbiddenException('System administrator access required');
      if (!Array.isArray(payload.permissions) || !payload.permissions.includes('platform:manage_tenants')) {
        throw new ForbiddenException('Missing platform administrator permission');
      }
      req.systemAuth = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
