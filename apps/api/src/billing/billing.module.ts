import { type DynamicModule, Module } from '@nestjs/common';
import {
  AuthorizationRepository,
  type CapabilityPolicy,
  type OrganizationStatePolicy,
} from '../authorization/authorization.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { BillingController } from './billing.controller.js';
import { BillingProjectionQueue, BillingRepository } from './billing.js';
import { BillingService } from './billing.service.js';
import { StripeWebhookVerifier } from './stripe-webhook.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';
import { BillingCheckoutGateway } from './checkout.js';
import type { StripePlanMappings } from './subscription-projection.js';
import { BillingPortalGateway } from './portal.js';

export interface BillingModuleOptions {
  repository: AuthorizationRepository;
  billingRepository: BillingRepository;
  projectionQueue: BillingProjectionQueue;
  checkoutGateway: BillingCheckoutGateway;
  checkoutReturnOrigins: string[];
  planMappings: StripePlanMappings;
  portalGateway: BillingPortalGateway;
  capabilityPolicy?: CapabilityPolicy;
  organizationStatePolicy: OrganizationStatePolicy;
  stripeWebhookSecret: string;
}

@Module({})
export class BillingModule {
  static register(options: BillingModuleOptions): DynamicModule {
    return {
      module: BillingModule,
      imports: [
        AuthorizationModule.register({
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy: options.organizationStatePolicy,
          repository: options.repository,
        }),
      ],
      controllers: [BillingController, StripeWebhookController],
      providers: [
        BillingService,
        { provide: BillingCheckoutGateway, useValue: options.checkoutGateway },
        { provide: BillingPortalGateway, useValue: options.portalGateway },
        {
          provide: 'CHECKOUT_RETURN_ORIGINS',
          useValue: options.checkoutReturnOrigins,
        },
        { provide: 'STRIPE_PLAN_MAPPINGS', useValue: options.planMappings },
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
