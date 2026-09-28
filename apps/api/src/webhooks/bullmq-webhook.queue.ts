import { type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  createRedisClient,
  deliverWebhookJobName,
  webhookDeliveryJobOptions,
  webhookDeliveryQueueName,
} from '@saas/tooling-config/webhook-queue';
import { WebhookDeliveryQueue } from './webhook.js';
export class BullMqWebhookDeliveryQueue
  extends WebhookDeliveryQueue
  implements OnModuleDestroy
{
  private readonly queue: Queue;
  constructor(redisUrl: URL) {
    super();
    this.queue = new Queue(webhookDeliveryQueueName, {
      connection: createRedisClient(redisUrl),
      defaultJobOptions: webhookDeliveryJobOptions,
    });
  }
  async enqueue(deliveryId: string) {
    await this.queue.add(
      deliverWebhookJobName,
      { deliveryId },
      { jobId: `webhook-${deliveryId}-${Date.now()}` },
    );
  }
  async onModuleDestroy() {
    await this.queue.close();
  }
}
