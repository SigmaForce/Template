import { type DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ContractExamplesController } from './contract-examples/contract-examples.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { ReadinessService } from '@saas/tooling-config/readiness';
import { AuthenticationModule } from './authentication/authentication.module.js';
import type { AuthenticationOptions } from './authentication/authentication.js';
import {
  OrganizationsModule,
  type OrganizationModuleOptions,
} from './organizations/organizations.module.js';
import { BillingModule } from './billing/billing.module.js';
import type {
  BillingProjectionQueue,
  BillingRepository,
} from './billing/billing.js';
import type { BillingCheckoutGateway } from './billing/checkout.js';
import type { StripePlanMappings } from './billing/subscription-projection.js';
import type { CapabilityPolicy } from './authorization/authorization.js';

export interface AppModuleOptions {
  authentication: AuthenticationOptions;
  capabilityPolicy?: CapabilityPolicy;
  billing: {
    projectionQueue: BillingProjectionQueue;
    repository: BillingRepository;
    checkoutGateway: BillingCheckoutGateway;
    checkoutReturnOrigins: string[];
    planMappings: StripePlanMappings;
    stripeWebhookSecret: string;
  };
  organizations: OrganizationModuleOptions;
}

@Module({})
export class AppModule {
  static register(options: AppModuleOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AuthenticationModule.register(options.authentication),
        OrganizationsModule.register({
          ...options.organizations,
          capabilityPolicy: options.capabilityPolicy,
        }),
        BillingModule.register({
          repository: options.organizations.repository,
          billingRepository: options.billing.repository,
          projectionQueue: options.billing.projectionQueue,
          checkoutGateway: options.billing.checkoutGateway,
          checkoutReturnOrigins: options.billing.checkoutReturnOrigins,
          planMappings: options.billing.planMappings,
          capabilityPolicy: options.capabilityPolicy,
          stripeWebhookSecret: options.billing.stripeWebhookSecret,
        }),
      ],
      controllers: [
        AppController,
        ContractExamplesController,
        ReadinessController,
      ],
      providers: [
        {
          provide: ReadinessService,
          useFactory: () => new ReadinessService('api'),
        },
      ],
    };
  }
}
