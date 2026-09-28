import { type OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import type { JsonLogger } from '@saas/tooling-config/logging';
import {
  createRedisClient,
  deliverWebhookJobName,
  webhookDeliveryQueueName,
} from '@saas/tooling-config/webhook-queue';
import {
  FetchWebhookTransport,
  PrismaWebhookRepository,
  WebhookDeliveryProcessor,
} from '@saas/api/webhook-worker';

export class WebhookDeliveryWorker implements OnModuleDestroy {
  private readonly repository: PrismaWebhookRepository;
  private readonly worker: Worker;
  constructor(options: {
    databaseUrl: URL;
    logger: JsonLogger;
    redisUrl: URL;
  }) {
    this.repository = new PrismaWebhookRepository(
      options.databaseUrl.toString(),
    );
    const processor = new WebhookDeliveryProcessor(
      this.repository,
      new FetchWebhookTransport(),
    );
    this.worker = new Worker(
      webhookDeliveryQueueName,
      async (job) => {
        if (job.name !== deliverWebhookJobName)
          throw new Error('Unknown webhook job.');
        await processor.process(
          job.data.deliveryId as string,
          job.attemptsMade + 1,
        );
      },
      { connection: createRedisClient(options.redisUrl) },
    );
    this.worker.on('failed', (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1))
        options.logger.error(
          {
            event: 'webhook.delivery.dead-lettered',
            deliveryId: job.data.deliveryId,
            error: error.name,
          },
          'Webhook delivery',
        );
    });
  }
  async onModuleDestroy() {
    await this.worker.close();
    await this.repository.onModuleDestroy();
  }
}
