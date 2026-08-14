import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { AppModule } from '../app.module';
import { MongooseDatabaseService } from '../common/mongoose-database.service';
import { AuditService } from '../modules/audit/audit.service';

const QUEUE_NAME = 'assethub-maintenance';
const JOB_NAME = 'license-maintenance';
const EVERY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection });

  await queue.upsertJobScheduler(
    JOB_NAME,
    { every: EVERY_MS },
    { name: JOB_NAME, data: { source: 'scheduler' }, opts: { removeOnComplete: 10, removeOnFail: 50 } },
  );

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const db = app.get(MongooseDatabaseService);
  const audit = app.get(AuditService);

  const worker = new Worker(
    QUEUE_NAME,
    async (_job: Job) => {
      const tenants = await db.tenant.find({ status: { $ne: 'archived' } }).select({ _id: 1 }).lean();
      let deleted = 0;
      for (const tenant of tenants) {
        const result = await audit.purgeExpired(String(tenant._id));
        deleted += result.deleted;
      }
      return { tenants: tenants.length, auditEventsDeleted: deleted };
    },
    { connection, concurrency: 1 },
  );

  worker.on('completed', (job, result) => {
    console.log(`[maintenance] ${job.name} completed`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[maintenance] ${job?.name ?? JOB_NAME} failed`, error);
  });

  const shutdown = async () => {
    await worker.close();
    await queue.close();
    await connection.quit();
    await app.close();
  };

  process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
  process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));

  console.log(`[maintenance] worker started; schedule=24h redis=${redisUrl.replace(/:\/\/.*@/, '://***@')}`);
}

void main().catch((error) => {
  console.error('[maintenance] worker bootstrap failed', error);
  process.exit(1);
});
