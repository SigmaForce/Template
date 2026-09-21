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

export interface AppModuleOptions {
  authentication: AuthenticationOptions;
  billing: {
    projectionQueue: BillingProjectionQueue;
    repository: BillingRepository;
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
        OrganizationsModule.register(options.organizations),
        BillingModule.register({
          repository: options.organizations.repository,
          billingRepository: options.billing.repository,
          projectionQueue: options.billing.projectionQueue,
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
