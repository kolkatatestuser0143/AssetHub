import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EntitlementService } from '../../modules/billing/entitlement.service';

/**
 * Defense-in-depth license enforcement.
 * TenantContextGuard authenticates the caller and RbacGuard authorizes the
 * permission; this interceptor adds the subscription-state gate for normal
 * tenant application APIs. License status itself remains readable after
 * expiry so an administrator can inspect the license and recover it.
 */
@Injectable()
export class TenantLicenseAccessInterceptor implements NestInterceptor {
  private readonly licenseExemptPaths = [
    '/api/v1/auth/',
    '/api/v1/billing/license',
    '/api/v1/health',
  ];

  constructor(private readonly entitlement: EntitlementService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    const auth = req.authContext;

    // System-admin requests and unauthenticated/public requests are handled
    // by their own guards/auth flows and must not be treated as tenant calls.
    if (!auth?.tenantId) return next.handle();

    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    if (this.licenseExemptPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return next.handle();
    }

    try {
      await this.entitlement.getActiveSubscription(auth.tenantId);
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new ForbiddenException('Tenant license is not active');
    }

    return next.handle();
  }
}
