import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TENANT_ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';
import { PrismaService } from '../database/prisma.service';
import { TenantStatus } from '../domain/tenancy.enums';

export interface AuthContext {
  userId: string;
  sessionId: string;
  tenantId: string;
  companyId: string;
  adminLevel: 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN';
  crossCompany: boolean;
  permissions: string[];
  allowedCompanyIds?: string[];
  allowedLocationIds?: string[];
  forcePasswordReset: boolean;
  authVersion?: number;
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : readCookie(req, TENANT_ACCESS_COOKIE);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.jwt.verify(token);
      if (!payload.sub || !payload.sessionId || !payload.tenantId || !payload.companyId) throw new UnauthorizedException('Invalid access token claims');

      const tenantId = String(payload.tenantId);
      const companyId = String(payload.companyId);
      const userId = String(payload.sub);

      const identity = await this.db.withTenantContext(tenantId, companyId, async tx => {
        const [user, tenant] = await Promise.all([
          tx.user.findFirst({
            where: { id: userId, tenantId, companyId, accountType: 'TENANT' },
            select: { authVersion: true, isActive: true, forcePasswordReset: true, adminLevel: true },
          }),
          tx.tenant.findUnique({ where: { id: tenantId }, select: { status: true } }),
        ]);
        return { user, tenant };
      });

      const { user, tenant } = identity;
      if (!user || user.isActive === false) throw new UnauthorizedException('Tenant account is inactive');
      if (Number(payload.authVersion ?? 0) !== Number(user.authVersion ?? 0)) throw new UnauthorizedException('Session is no longer valid');
      if (!tenant) throw new UnauthorizedException('Tenant account is unavailable');
      if (tenant.status !== TenantStatus.ACTIVE) {
        if (tenant.status === TenantStatus.SUSPENDED) throw new UnauthorizedException('This tenant is suspended. Please contact your system administrator.');
        if (tenant.status === TenantStatus.ARCHIVED) throw new UnauthorizedException('This tenant is archived and cannot be accessed.');
        throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      }

      req.authContext = {
        userId,
        sessionId: String(payload.sessionId),
        tenantId,
        companyId,
        adminLevel: (user.adminLevel ?? payload.adminLevel ?? 'EMPLOYEE') as AuthContext['adminLevel'],
        crossCompany: !!payload.crossCompany,
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
        allowedCompanyIds: Array.isArray(payload.allowedCompanyIds) ? payload.allowedCompanyIds.map(String) : [],
        allowedLocationIds: Array.isArray(payload.allowedLocationIds) ? payload.allowedLocationIds.map(String) : [],
        forcePasswordReset: user.forcePasswordReset === true,
        authVersion: Number(user.authVersion ?? 0),
      } as AuthContext;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
