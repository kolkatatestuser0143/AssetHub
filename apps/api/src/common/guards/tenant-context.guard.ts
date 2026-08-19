import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TENANT_ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';
import { MongooseDatabaseService } from '../mongoose-database.service';
import { TenantStatus } from '../../models/tenancy.schemas';

export interface AuthContext {
  userId: string;
  sessionId: string;
  tenantId: string;
  companyId: string;
  adminLevel: 'EMPLOYEE' | 'COMPANY_ADMIN' | 'TENANT_ADMIN';
  crossCompany: boolean;
  permissions: string[];
  forcePasswordReset: boolean;
  authVersion?: number;
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly db: MongooseDatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : readCookie(req, TENANT_ACCESS_COOKIE);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.jwt.verify(token);
      if (!payload.sub || !payload.sessionId || !payload.tenantId || !payload.companyId) throw new UnauthorizedException('Invalid access token claims');
      const user = await this.db.user.findOne({ _id: payload.sub, tenantId: payload.tenantId, accountType: 'TENANT' }).select({ authVersion: 1, isActive: 1, forcePasswordReset: 1, adminLevel: 1 }).lean();
      if (!user || user.isActive === false) throw new UnauthorizedException('Tenant account is inactive');
      if (Number(payload.authVersion ?? 0) !== Number(user.authVersion ?? 0)) throw new UnauthorizedException('Session is no longer valid');
      const tenant = await this.db.tenant.findById(payload.tenantId).select({ status: 1 }).lean();
      if (!tenant) throw new UnauthorizedException('Tenant account is unavailable');
      if (tenant.status !== TenantStatus.ACTIVE) {
        if (tenant.status === TenantStatus.SUSPENDED) throw new UnauthorizedException('This tenant is suspended. Please contact your system administrator.');
        if (tenant.status === TenantStatus.ARCHIVED) throw new UnauthorizedException('This tenant is archived and cannot be accessed.');
        throw new UnauthorizedException('This tenant account is unavailable. Please contact your system administrator.');
      }

      req.authContext = {
        userId: payload.sub,
        sessionId: payload.sessionId,
        tenantId: payload.tenantId,
        companyId: payload.companyId,
        adminLevel: (user.adminLevel ?? payload.adminLevel ?? 'EMPLOYEE') as AuthContext['adminLevel'],
        crossCompany: !!payload.crossCompany,
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
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
