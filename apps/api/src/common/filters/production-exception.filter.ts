import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class ProductionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<any>();
    const request = host.switchToHttp().getRequest<any>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request.requestId ?? request.headers?.['x-request-id'] ?? null;
    if (status >= 500) this.logger.error(`${request.method} ${request.url} ${status} requestId=${requestId}`, exception instanceof Error ? exception.stack : String(exception));
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const message = typeof raw === 'object' && raw !== null && 'message' in raw ? (raw as any).message : exception instanceof HttpException ? raw : 'Internal server error';
    response.status(status).json({ statusCode: status, message, requestId, timestamp: new Date().toISOString(), path: request.url });
  }
}
