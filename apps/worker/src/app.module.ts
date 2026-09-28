import { type DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { ReadinessService } from '@saas/tooling-config/readiness';
import type { JsonLogger } from '@saas/tooling-config/logging';
import type { StripePlanMappings } from '@saas/api/billing-worker';
import { BillingProjectionWorker } from './billing/billing-projection.worker.js';
import { WebhookDeliveryWorker } from './webhooks/webhook-delivery.worker.js';
import { NotificationWorker } from './notifications/notification.worker.js';

@Module({
  imports: [],
  controllers: [AppController, ReadinessController],
  providers: [
    {
      provide: ReadinessService,
      useFactory: () => new ReadinessService('worker'),
    },
  ],
})
export class AppModule {
  static register(options: {
    databaseUrl: URL;
    logger: JsonLogger;
    planMappings: StripePlanMappings;
    redisUrl: URL;
  }): DynamicModule {
    return {
      module: AppModule,
      providers: [
        {
          provide: BillingProjectionWorker,
          useFactory: () => new BillingProjectionWorker(options),
        },
        {
          provide: WebhookDeliveryWorker,
          useFactory: () => new WebhookDeliveryWorker(options),
        },
        {
          provide: NotificationWorker,
          useFactory: () => new NotificationWorker(options),
        },
      ],
    };
  }
}
