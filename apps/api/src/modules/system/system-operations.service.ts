import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAME = 'assethub-maintenance';

@Injectable()
export class SystemOperationsService {
  private connection() {
    return new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null, lazyConnect: true });
  }

  async jobs() {
    const connection = this.connection();
    const queue = new Queue(QUEUE_NAME, { connection });
    try {
      await connection.connect();
      const [counts, jobs] = await Promise.all([
        queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
        queue.getJobs(['waiting', 'active', 'failed', 'delayed'], 0, 49, true),
      ]);
      return {
        queue: QUEUE_NAME,
        counts,
        jobs: jobs.map((job) => ({
          id: job.id,
          name: job.name,
          state: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : job.processedOn ? 'active' : 'waiting',
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason ?? null,
          timestamp: job.timestamp,
          processedOn: job.processedOn ?? null,
          finishedOn: job.finishedOn ?? null,
        })),
      };
    } finally {
      await queue.close();
      await connection.quit();
    }
  }

  async health() {
    const started = Date.now();
    const connection = this.connection();
    const queue = new Queue(QUEUE_NAME, { connection });
    try {
      await connection.connect();
      await connection.ping();
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
      return { status: 'healthy', latencyMs: Date.now() - started, redis: 'healthy', queue: QUEUE_NAME, counts };
    } catch (error) {
      return { status: 'degraded', latencyMs: Date.now() - started, redis: 'unhealthy', queue: QUEUE_NAME, counts: null, error: error instanceof Error ? error.message : 'Redis unavailable' };
    } finally {
      await queue.close();
      await connection.quit();
    }
  }
}
