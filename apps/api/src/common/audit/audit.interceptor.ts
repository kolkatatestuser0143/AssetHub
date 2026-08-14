import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();
    const method = String(req.method ?? 'GET').toUpperCase();
    const route = String(req.route?.path ?? req.originalUrl ?? req.url ?? 'unknown');

    const ignored = method === 'OPTIONS' || route.includes('/api/docs') || route.includes('/health') || route.includes('/audit');
    const auth = req.authContext;
    if (ignored || !auth?.tenantId) return next.handle();

    const shouldRecord = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!shouldRecord) return next.handle();

    const targetId = req.params?.assetId
      ?? req.params?.userId
      ?? req.params?.companyId
      ?? req.params?.vendorId
      ?? req.params?.roleId
      ?? req.params?.idpConfigId
      ?? req.params?.tokenId;
    const targetType = this.inferTargetType(route, req.params ?? {});
    const base = {
      tenantId: auth.tenantId,
      companyId: auth.companyId,
      actorUserId: auth.userId,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      route,
      method,
      ipAddress: req.ip,
      userAgent: String(req.headers?.['user-agent'] ?? '').slice(0, 500),
    };

    return next.handle().pipe(
      tap(() => {
        void this.audit.record({
          ...base,
          action: `${method.toLowerCase()}.${this.normalizeRoute(route)}`,
          result: 'success',
          statusCode: res.statusCode,
          metadata: {},
        }).catch(() => undefined);
      }),
      catchError((error) => {
        void this.audit.record({
          ...base,
          action: `${method.toLowerCase()}.${this.normalizeRoute(route)}.failed`,
          result: 'failure',
          statusCode: error?.status ?? 500,
          metadata: { error: String(error?.message ?? 'Request failed').slice(0, 1000) },
        }).catch(() => undefined);
        throw error;
      }),
    );
  }

  private normalizeRoute(route: string): string {
    return route
      .replace(/^\/+/, '')
      .replace(/^api\/v1\//, '')
      .replace(/[:/]+/g, '.')
      .replace(/\.\.+/g, '.')
      .replace(/\.+$/g, '')
      .toLowerCase();
  }

  private inferTargetType(route: string, params: Record<string, unknown>): string | undefined {
    if (params.assetId || route.includes('/assets')) return 'asset';
    if (params.userId || route.includes('/users')) return 'user';
    if (params.roleId || route.includes('/roles')) return 'role';
    if (params.vendorId || route.includes('/vendors')) return 'vendor';
    if (params.companyId || route.includes('/companies')) return 'company';
    if (params.idpConfigId || route.includes('/identity')) return 'identity_provider';
    if (params.tokenId || route.includes('/scim')) return 'scim';
    return undefined;
  }
}
