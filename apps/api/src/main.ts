import './bootstrap-dns';
import { config as loadEnv } from 'dotenv';
import path from 'path';

const rootEnv = path.resolve(__dirname, '../../../.env');
loadEnv({ path: rootEnv, override: true });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './common/request-context.interceptor';
import { ProductionExceptionFilter } from './common/filters/production-exception.filter';
import { csrfMiddleware } from './common/security/csrf.middleware';

function configuredOrigins(): string[] { return (process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean); }
function isAllowedOrigin(origin: string | undefined, configured: string[]): boolean { if (!origin) return true; if (configured.includes(origin)) return true; if (process.env.NODE_ENV === 'production') return false; return /^https?:\/\/([a-z0-9-]+\.)?localhost(?::\d+)?$/i.test(origin) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin); }
function safeMongoFingerprint(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) return 'unconfigured';
  try {
    const parsed = new URL(uri);
    const host = parsed.hostname || 'unknown-host';
    const database = parsed.pathname.replace(/^\//, '').split('/')[0] || '(default)';
    return `${parsed.protocol}//${host}/${database}`;
  } catch {
    return 'invalid-uri';
  }
}

async function bootstrap() {
  console.log(`[CONFIG] Root .env: ${rootEnv}`);
  console.log(`[CONFIG] Mongo target: ${safeMongoFingerprint()}`);
  console.log(`[CONFIG] API port: ${process.env.PORT ?? 3001}`);
  const app = await NestFactory.create(AppModule);
  const configured = configuredOrigins();
  app.enableCors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin, configured)), credentials: true, methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Scope', 'X-Request-ID', 'X-Tenant-Slug', 'X-CSRF-Token'], exposedHeaders: ['X-Request-ID'] });
  app.use(csrfMiddleware);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalInterceptors(new RequestContextInterceptor());
  app.useGlobalFilters(new ProductionExceptionFilter());
  app.setGlobalPrefix('api/v1');
  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) { const config = new DocumentBuilder().setTitle('ITAM SaaS API').setDescription('Enterprise IT Asset Management API').setVersion('0.1.0').addBearerAuth().build(); SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config)); }
  const shutdown = async () => { await app.close(); process.exit(0); };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((error) => { console.error('API bootstrap failed', error); process.exit(1); });
