import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.jwt.verify(header.slice(7));
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
