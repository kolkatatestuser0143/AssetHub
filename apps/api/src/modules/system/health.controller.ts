import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import IORedis from 'ioredis';
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @HttpCode(HttpStatus.OK) async health(){const postgresql=await this.postgresStatus(),redis=await this.redisStatus();return{status:postgresql&&redis?'ok':'degraded',uptimeSeconds:Math.floor(process.uptime()),timestamp:new Date().toISOString(),checks:{postgresql:postgresql?'healthy':'unhealthy',redis:redis?'healthy':'unhealthy'}};}
  @Get('live') @HttpCode(HttpStatus.OK) live(){return{status:'ok',timestamp:new Date().toISOString()};}
  @Get('ready') async ready(){const postgresql=await this.postgresStatus(),redis=await this.redisStatus(),checks={postgresql:postgresql?'healthy':'unhealthy',redis:redis?'healthy':'unhealthy'};if(!postgresql||!redis)throw new ServiceUnavailableException({status:'not_ready',checks});return{status:'ready',checks};}
  private async postgresStatus(){try{await this.prisma.$queryRaw`SELECT 1`;return true;}catch{return false;}}
  private async redisStatus(){const redis=new IORedis(process.env.REDIS_URL||'redis://localhost:6379',{maxRetriesPerRequest:1,connectTimeout:1500,lazyConnect:true});try{await redis.connect();await redis.ping();return true;}catch{return false;}finally{await redis.quit().catch(()=>undefined);}}
}
