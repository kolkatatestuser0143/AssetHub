import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TENANT_ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';
import { PrismaService } from '../database/prisma.service';
import { TenantStatus } from '../domain/tenancy.enums';

export interface AuthContext {
  userId: string;
  sessionId: string;
  tenantId: string;
  /** User's home/primary company. Not an authorization scope. */
  companyId: string;
  /** Effective company scope. null means the whole tenant. */
  scopeCompanyId: string | null;
  /** True when authorization applies to every company in the tenant. */
  tenantWide: boolean;
  /** Backward-compatible alias for tenant-wide company access. */
  crossCompany: boolean;
  adminLevel: 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN';
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
      if (!payload.sub || !payload.sessionId || !payload.tenantId) throw new UnauthorizedException('Invalid access token claims');

      const user = await this.db.user.findFirst({
        where: { id: String(payload.sub), tenantId: String(payload.tenantId), accountType: 'TENANT' },
        select: { authVersion: true, isActive: true, forcePasswordReset: true, adminLevel: true, companyId: true },
      });
      if (!user || user.isActive === false) throw new UnauthorizedException('Tenant account is inactive');
      if (Number(payload.authVersion ?? 0) !== Number(user.authVersion ?? 0)) throw new UnauthorizedException('Session is no longer valid');

      const tenant = await this.db.tenant.findUnique({ where: { id: String(payload.tenantId) }, select: { status: true } });
      if (!tenant) throw new UnauthorizedException('Tenant account is unavailable');
      if (tenant.status !== TenantStatus.ACTIVE) {
        if (tenant.status === TenantStatus.SUSPENDED) throw new UnauthorizedException('This tenant is suspended. Please contact your system administrator.');
        if (tenant.status === TenantStatus.ARCHIVED) throw new UnauthorizedException('This tenant is archived and cannot be accessed.');
        throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      }

      const tenantWide = payload.tenantWide === true || payload.crossCompany === true;
      const rawScopeCompanyId = payload.scopeCompanyId == null ? null : String(payload.scopeCompanyId);
      const scopeCompanyId = tenantWide ? null : (rawScopeCompanyId ?? user.companyId);

      req.authContext = {
        userId: String(payload.sub),
        sessionId: String(payload.sessionId),
        tenantId: String(payload.tenantId),
        companyId: user.companyId,
        scopeCompanyId,
        tenantWide,
        crossCompany: tenantWide,
        adminLevel: (user.adminLevel ?? payload.adminLevel ?? 'EMPLOYEE') as AuthContext['adminLevel'],
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
