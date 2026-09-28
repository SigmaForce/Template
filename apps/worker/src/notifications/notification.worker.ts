import { type OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import type { JsonLogger } from '@saas/tooling-config/logging';
import {
  createRedisClient,
  notificationQueueName,
  sendNotificationJobName,
} from '@saas/tooling-config/notification-queue';
import {
  NotificationProcessor,
  PrismaAuditEventRepository,
  PrismaNotificationRepository,
  type NotificationProvider,
} from '@saas/api/notification-worker';
export class NotificationWorker implements OnModuleDestroy {
  private readonly repository: PrismaNotificationRepository;
  private readonly audit: PrismaAuditEventRepository;
  private readonly worker: Worker;
  constructor(options: {
    databaseUrl: URL;
    logger: JsonLogger;
    redisUrl: URL;
    provider?: NotificationProvider;
  }) {
    this.repository = new PrismaNotificationRepository(
      options.databaseUrl.toString(),
    );
    this.audit = new PrismaAuditEventRepository(options.databaseUrl.toString());
    const processor = new NotificationProcessor(
      this.repository,
      this.audit,
      options.provider,
    );
    this.worker = new Worker(
      notificationQueueName,
      async (job) => {
        if (job.name !== sendNotificationJobName)
          throw new Error('Unknown notification job.');
        await processor.process(
          job.data.notificationId as string,
          job.attemptsMade + 1,
        );
      },
      { connection: createRedisClient(options.redisUrl) },
    );
    this.worker.on('failed', (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1))
        options.logger.error(
          {
            event: 'notification.dead-lettered',
            notificationId: job.data.notificationId,
            error: error.name,
          },
          'Notification delivery failed',
        );
    });
  }
  async onModuleDestroy() {
    await this.worker.close();
    await this.repository.onModuleDestroy();
    await this.audit.onModuleDestroy();
  }
}
