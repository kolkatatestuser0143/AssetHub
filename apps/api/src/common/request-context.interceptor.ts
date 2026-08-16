import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();
    const requestId = String(req.headers?.['x-request-id'] ?? '').trim() || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    return next.handle();
  }
}
