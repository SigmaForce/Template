import { type DynamicModule, Module } from '@nestjs/common';
import { AuthorizationRepository } from '../authorization/authorization.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { BillingController } from './billing.controller.js';
import { BillingProjectionQueue, BillingRepository } from './billing.js';
import { BillingService } from './billing.service.js';
import { StripeWebhookVerifier } from './stripe-webhook.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';

export interface BillingModuleOptions {
  repository: AuthorizationRepository;
  billingRepository: BillingRepository;
  projectionQueue: BillingProjectionQueue;
  stripeWebhookSecret: string;
}

@Module({})
export class BillingModule {
  static register(options: BillingModuleOptions): DynamicModule {
    return {
      module: BillingModule,
      imports: [
        AuthorizationModule.register({ repository: options.repository }),
      ],
      controllers: [BillingController, StripeWebhookController],
      providers: [
        BillingService,
        { provide: BillingRepository, useValue: options.billingRepository },
        {
          provide: BillingProjectionQueue,
          useValue: options.projectionQueue,
        },
        {
          provide: StripeWebhookVerifier,
          useValue: new StripeWebhookVerifier(options.stripeWebhookSecret),
        },
      ],
    };
  }
}
