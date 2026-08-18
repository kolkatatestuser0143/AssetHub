import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import IORedis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly mongo: Connection) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async health() {
    const mongo = this.mongo.readyState === 1;
    const redis = await this.redisStatus();
    return { status: mongo && redis ? 'ok' : 'degraded', uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString(), checks: { mongodb: mongo ? 'healthy' : 'unhealthy', redis: redis ? 'healthy' : 'unhealthy' } };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() { return { status: 'ok', timestamp: new Date().toISOString() }; }

  @Get('ready')
  async ready() {
    const mongo = this.mongo.readyState === 1;
    const redis = await this.redisStatus();
    const checks = { mongodb: mongo ? 'healthy' : 'unhealthy', redis: redis ? 'healthy' : 'unhealthy' };
    if (!mongo || !redis) {
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    }
    return { status: 'ready', checks };
  }

  private async redisStatus() {
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: 1, connectTimeout: 1500, lazyConnect: true });
    try { await redis.connect(); await redis.ping(); return true; } catch { return false; } finally { await redis.quit().catch(() => undefined); }
  }
}
