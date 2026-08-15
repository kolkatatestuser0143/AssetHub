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
const GRACE_DAYS = Number(process.env.LICENSE_GRACE_DAYS ?? 7);
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection });

  await queue.upsertJobScheduler(JOB_NAME, { every: EVERY_MS }, { name: JOB_NAME, data: { source: 'scheduler' }, opts: { removeOnComplete: 10, removeOnFail: 50 } });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const db = app.get(MongooseDatabaseService);
  const audit = app.get(AuditService);

  const worker = new Worker(QUEUE_NAME, async (_job: Job) => {
    const now = new Date();
    const graceCutoff = new Date(now.getTime() - GRACE_MS);
    let trialExpired = 0;
    let graceStarted = 0;
    let expired = 0;
    let auditEventsDeleted = 0;

    const trialing = await db.subscription.find({ status: 'trialing', endsAt: { $lte: now } }).lean();
    for (const subscription of trialing) {
      const graceUntil = new Date(now.getTime() + GRACE_MS);
      await db.subscription.updateOne({ _id: subscription._id, status: 'trialing' }, { $set: { status: 'past_due', graceUntil } });
      await db.auditEvent.create({ tenantId: subscription.tenantId, action: 'subscription.trial_expired', targetType: 'subscription', targetId: String(subscription._id), metadata: { graceUntil, graceDays: GRACE_DAYS }, occurredAt: now });
      trialExpired++;
      graceStarted++;
    }

    const activeExpired = await db.subscription.find({ status: 'active', endsAt: { $lte: now } }).lean();
    for (const subscription of activeExpired) {
      const graceUntil = new Date(now.getTime() + GRACE_MS);
      await db.subscription.updateOne({ _id: subscription._id, status: 'active' }, { $set: { status: 'past_due', graceUntil } });
      await db.auditEvent.create({ tenantId: subscription.tenantId, action: 'subscription.grace_started', targetType: 'subscription', targetId: String(subscription._id), metadata: { graceUntil, graceDays: GRACE_DAYS }, occurredAt: now });
      graceStarted++;
    }

    const graceExpired = await db.subscription.find({ status: 'past_due', endsAt: { $lte: graceCutoff } }).lean();
    for (const subscription of graceExpired) {
      const graceUntil = (subscription as any).graceUntil ? new Date((subscription as any).graceUntil) : graceCutoff;
      if (graceUntil > now) continue;
      await db.subscription.updateOne({ _id: subscription._id, status: 'past_due' }, { $set: { status: 'expired' } });
      await db.auditEvent.create({ tenantId: subscription.tenantId, action: 'subscription.expired', targetType: 'subscription', targetId: String(subscription._id), metadata: { graceUntil }, occurredAt: now });
      expired++;
    }

    const tenants = await db.tenant.find({ status: { $ne: 'archived' } }).select({ _id: 1 }).lean();
    for (const tenant of tenants) {
      const result = await audit.purgeExpired(String(tenant._id));
      auditEventsDeleted += result.deleted;
    }

    return { tenants: tenants.length, trialExpired, graceStarted, expired, auditEventsDeleted };
  }, { connection, concurrency: 1 });

  worker.on('completed', (job, result) => console.log(`[maintenance] ${job.name} completed`, result));
  worker.on('failed', (job, error) => console.error(`[maintenance] ${job?.name ?? JOB_NAME} failed`, error));

  const shutdown = async () => { await worker.close(); await queue.close(); await connection.quit(); await app.close(); };
  process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
  process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));

  console.log(`[maintenance] worker started; schedule=24h grace=${GRACE_DAYS}d redis=${redisUrl.replace(/:\/\/.*@/, '://***@')}`);
}

void main().catch((error) => { console.error('[maintenance] worker bootstrap failed', error); process.exit(1); });
