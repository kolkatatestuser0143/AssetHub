import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { SYSTEM_ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';
import { SYSTEM_PERMISSION_KEY } from './system-permission.decorator';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : readCookie(req, SYSTEM_ACCESS_COOKIE);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.jwt.verify(token);
      if (payload?.accountType !== 'SYSTEM' || payload?.systemAdmin !== true) throw new ForbiddenException('System console access required');

      const user = await this.prisma.user.findUnique({ where: { id: String(payload.sub) }, select: { accountType: true, authVersion: true, isActive: true } });
      if (!user || user.accountType !== 'SYSTEM' || user.isActive === false) throw new UnauthorizedException('System administrator account is inactive');
      if (Number(payload.authVersion ?? 0) !== Number(user.authVersion ?? 0)) throw new UnauthorizedException('System administrator session is no longer valid');

      const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
      const required = this.reflector.getAllAndOverride<string>(SYSTEM_PERMISSION_KEY, [context.getHandler(), context.getClass()]) ?? 'platform:console:access';
      if (!permissions.includes(required)) throw new ForbiddenException(`Missing platform permission: ${required}`);

      req.systemAuth = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
