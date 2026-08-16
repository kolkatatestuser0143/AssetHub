import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * A forced password reset is a backend security state, not just a frontend
 * redirect. Tenant sessions carrying forcePasswordReset may only use the
 * minimum endpoints required to complete or terminate that session.
 */
@Injectable()
export class PasswordResetRequiredInterceptor implements NestInterceptor {
  private readonly allowedPrefixes = [
    '/api/v1/auth/change-password',
    '/api/v1/auth/logout',
    '/api/v1/auth/session',
    '/api/v1/auth/refresh',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const auth = req.authContext;
    if (!auth?.tenantId || !auth.forcePasswordReset) return next.handle();

    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    const allowed = this.allowedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    if (!allowed) {
      throw new ForbiddenException('Password change is required before accessing the tenant console');
    }

    return next.handle();
  }
}
