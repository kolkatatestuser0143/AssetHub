import './bootstrap-dns';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// The workspace .env is the canonical API environment. Loading it explicitly
// avoids configuration depending on the directory from which pnpm starts the
// Nest process.
loadEnv({ path: path.resolve(__dirname, '../../../.env'), override: false });
loadEnv({ path: path.resolve(__dirname, '../.env'), override: false });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './common/request-context.interceptor';

function configuredOrigins(): string[] {
  return (process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | undefined, configured: string[]): boolean {
  if (!origin) return true;
  if (configured.includes(origin)) return true;
  if (process.env.NODE_ENV === 'production') return false;
  return /^https?:\/\/([a-z0-9-]+\.)?localhost(?::\d+)?$/i.test(origin)
    || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configured = configuredOrigins();

  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin, configured)),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Scope', 'X-Request-ID', 'X-Tenant-Slug'],
    exposedHeaders: ['X-Request-ID'],
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.useGlobalInterceptors(new RequestContextInterceptor());
  app.setGlobalPrefix('api/v1');

  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('ITAM SaaS API')
      .setDescription('Enterprise IT Asset Management API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
