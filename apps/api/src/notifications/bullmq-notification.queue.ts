import { type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  createRedisClient,
  notificationJobOptions,
  notificationQueueName,
  sendNotificationJobName,
} from '@saas/tooling-config/notification-queue';
import { NotificationQueue } from './notification.js';
export class BullMqNotificationQueue
  extends NotificationQueue
  implements OnModuleDestroy
{
  private readonly queue: Queue;
  constructor(redisUrl: URL) {
    super();
    this.queue = new Queue(notificationQueueName, {
      connection: createRedisClient(redisUrl),
      defaultJobOptions: notificationJobOptions,
    });
  }
  async enqueue(id: string) {
    await this.queue.add(
      sendNotificationJobName,
      { notificationId: id },
      { jobId: `notification-${id}` },
    );
  }
  async onModuleDestroy() {
    await this.queue.close();
  }
}
