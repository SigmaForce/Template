import { type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  billingProjectionJobOptions,
  billingProjectionQueueName,
  projectStripeSubscriptionJobName,
  createRedisClient,
} from '@saas/tooling-config/billing-queue';
import { BillingProjectionQueue } from './billing.js';

export class BullMqBillingProjectionQueue
  extends BillingProjectionQueue
  implements OnModuleDestroy
{
  private readonly queue: Queue;

  constructor(redisUrl: URL) {
    super();
    this.queue = new Queue(billingProjectionQueueName, {
      connection: createRedisClient(redisUrl),
      defaultJobOptions: billingProjectionJobOptions,
    });
  }

  async enqueue(eventId: string, wakeEventId?: string) {
    await this.queue.add(
      projectStripeSubscriptionJobName,
      { eventId },
      {
        jobId: `stripe-${eventId}${wakeEventId ? `-after-${wakeEventId}` : ''}`,
      },
    );
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
