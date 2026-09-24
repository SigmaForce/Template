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
import type { BillingPortalGateway } from './billing/portal.js';
import { SubscriptionSeatAllowancePolicy } from './billing/subscription-seat-allowance-policy.js';
import { SubscriptionOrganizationStatePolicy } from './billing/subscription-organization-state-policy.js';

export interface AppModuleOptions {
  authentication: AuthenticationOptions;
  capabilityPolicy?: CapabilityPolicy;
  billing: {
    projectionQueue: BillingProjectionQueue;
    repository: BillingRepository;
    checkoutGateway: BillingCheckoutGateway;
    checkoutReturnOrigins: string[];
    planMappings: StripePlanMappings;
    portalGateway: BillingPortalGateway;
    stripeWebhookSecret: string;
  };
  organizations: Omit<
    OrganizationModuleOptions,
    'organizationStatePolicy' | 'seatAllowancePolicy'
  >;
}

@Module({})
export class AppModule {
  static register(options: AppModuleOptions): DynamicModule {
    const organizationStatePolicy = new SubscriptionOrganizationStatePolicy(
      options.billing.repository,
    );
    return {
      module: AppModule,
      imports: [
        AuthenticationModule.register(options.authentication),
        OrganizationsModule.register({
          ...options.organizations,
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy,
          seatAllowancePolicy: new SubscriptionSeatAllowancePolicy(
            options.billing.repository,
          ),
        }),
        BillingModule.register({
          repository: options.organizations.repository,
          billingRepository: options.billing.repository,
          projectionQueue: options.billing.projectionQueue,
          checkoutGateway: options.billing.checkoutGateway,
          checkoutReturnOrigins: options.billing.checkoutReturnOrigins,
          planMappings: options.billing.planMappings,
          portalGateway: options.billing.portalGateway,
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy,
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
