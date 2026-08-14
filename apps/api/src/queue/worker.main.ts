import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { AppModule } from '../app.module';
import { MongooseDatabaseService } from '../common/mongoose-database.service';
import { AuditService } from '../modules/audit/audit.service';
import { MailService } from '../common/mail/mail.service';

const QUEUE_NAME = 'assethub-maintenance';
const JOB_NAME = 'license-maintenance';
const EVERY_MS = 24 * 60 * 60 * 1000;
const WARNING_DAYS = [90, 60, 30, 7];
const BILLING_PERMISSION = 'billing:read';

async function sendLicenseNotifications(
  db: MongooseDatabaseService,
  audit: AuditService,
  mail: MailService,
  tenant: any,
) {
  const subscription = await db.subscription
    .findOne({ tenantId: String(tenant._id), status: { $in: ['active', 'trialing', 'past_due'] } })
    .sort({ createdAt: -1 })
    .lean();
  if (!subscription?.endsAt) return { recipients: 0, sent: 0 };

  const endsAt = new Date(subscription.endsAt);
  const diffMs = endsAt.getTime() - Date.now();
  const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const expired = diffMs <= 0;

  let warningDay: number | undefined;
  if (!expired) {
    warningDay = WARNING_DAYS.find((days, index) => {
      const lowerExclusive = WARNING_DAYS[index + 1] ?? 0;
      return daysRemaining <= days && daysRemaining > lowerExclusive;
    });
  }

  if (!expired && warningDay === undefined) return { recipients: 0, sent: 0 };

  const notificationKey = expired ? 'expired' : `expires-${warningDay}`;
  const alreadySent = await db.auditEvent.exists({
    tenantId: String(tenant._id),
    action: 'license.expiry_notification_sent',
    'metadata.notificationKey': notificationKey,
  });
  if (alreadySent) return { recipients: 0, sent: 0 };

  const plan = await db.plan.findById(subscription.planId).select({ name: 1 }).lean();
  const roles = await db.role.find({
    tenantId: String(tenant._id),
    permissions: { $elemMatch: { permissionKey: BILLING_PERMISSION } },
  }).select({ _id: 1 }).lean();
  const roleIds = roles.map((role: any) => String(role._id));
  if (!roleIds.length) return { recipients: 0, sent: 0 };

  const recipients = await db.user.find({
    tenantId: String(tenant._id),
    accountType: 'TENANT',
    isActive: true,
    roleIds: { $in: roleIds },
  }).select({ email: 1, firstName: 1 }).lean();

  let sent = 0;
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    try {
      const result = await mail.sendLicenseExpiryEmail({
        to: recipient.email,
        firstName: recipient.firstName || 'there',
        tenantName: tenant.name,
        planName: plan?.name ?? String(subscription.planId),
        endsAt,
        daysRemaining: Math.max(daysRemaining, 0),
        expired,
      });
      if (result.sent) sent += 1;
    } catch (error) {
      console.error(`[maintenance] license notification failed for tenant=${tenant._id} recipient=${recipient.email}`, error);
    }
  }

  if (sent > 0) {
    await db.auditEvent.create({
      tenantId: String(tenant._id),
      action: 'license.expiry_notification_sent',
      targetType: 'subscription',
      targetId: String(subscription._id),
      metadata: {
        notificationKey,
        recipients: sent,
        expired,
        daysRemaining: Math.max(daysRemaining, 0),
      },
      occurredAt: new Date(),
    });
  }

  return { recipients: recipients.length, sent };
}

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
  const mail = app.get(MailService);

  const worker = new Worker(
    QUEUE_NAME,
    async (_job: Job) => {
      const tenants = await db.tenant.find({ status: { $ne: 'archived' } }).select({ _id: 1, name: 1 }).lean();
      let deleted = 0;
      let notificationRecipients = 0;
      let notificationsSent = 0;

      for (const tenant of tenants) {
        const result = await audit.purgeExpired(String(tenant._id));
        deleted += result.deleted;

        const notification = await sendLicenseNotifications(db, audit, mail, tenant);
        notificationRecipients += notification.recipients;
        notificationsSent += notification.sent;
      }

      return {
        tenants: tenants.length,
        auditEventsDeleted: deleted,
        licenseNotificationRecipients: notificationRecipients,
        licenseNotificationsSent: notificationsSent,
      };
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
