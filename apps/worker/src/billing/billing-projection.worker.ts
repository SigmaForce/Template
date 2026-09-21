import { type OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import type { JsonLogger } from '@saas/tooling-config/logging';
import {
  PostgresBillingProjectionRepository,
  SubscriptionProjector,
  type StripePlanMappings,
} from '@saas/api/billing-worker';
import {
  billingProjectionQueueName,
  projectStripeSubscriptionJobName,
  createRedisClient,
} from '@saas/tooling-config/billing-queue';

export class BillingProjectionWorker implements OnModuleDestroy {
  private readonly repository: PostgresBillingProjectionRepository;
  private readonly worker: Worker;

  constructor(options: {
    databaseUrl: URL;
    logger: JsonLogger;
    planMappings: StripePlanMappings;
    redisUrl: URL;
  }) {
    this.repository = new PostgresBillingProjectionRepository(
      options.databaseUrl.toString(),
    );
    const projector = new SubscriptionProjector(
      this.repository,
      options.planMappings,
      options.logger,
    );
    this.worker = new Worker(
      billingProjectionQueueName,
      async (job) => {
        if (job.name !== projectStripeSubscriptionJobName) {
          throw new Error('Unknown billing projection job.');
        }
        await projector.process(job.data.eventId as string);
      },
      { connection: createRedisClient(options.redisUrl) },
    );
    this.worker.on('failed', (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        options.logger.error({
          event: 'billing.subscription.projection.dead-lettered',
          eventId:
            typeof job.data.eventId === 'string' ? job.data.eventId : undefined,
          error: error.name,
        });
      }
    });
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.repository.close();
  }
}
