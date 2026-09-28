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
import type { AuditEventRepository } from './audit-events/audit-event.js';
import { AuditEventsModule } from './audit-events/audit-events.module.js';
import { FilesModule } from './files/files.module.js';
import type { FileRepository, FileStorage } from './files/file.js';
import { ApiKeysModule } from './api-keys/api-keys.module.js';
import type { ApiKeyRepository } from './api-keys/api-key.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import type {
  WebhookDeliveryQueue,
  WebhookRepository,
} from './webhooks/webhook.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import type {
  NotificationQueue,
  NotificationRepository,
} from './notifications/notification.js';
import {
  OperatorsModule,
  type OperatorsModuleOptions,
} from './operators/operators.module.js';

export interface AppModuleOptions {
  apiKeys: { repository: ApiKeyRepository };
  auditEvents: { repository: AuditEventRepository };
  authentication: AuthenticationOptions;
  capabilityPolicy?: CapabilityPolicy;
  files?: { repository: FileRepository; storage: FileStorage };
  webhooks?: { repository: WebhookRepository; queue: WebhookDeliveryQueue };
  notifications?: {
    repository: NotificationRepository;
    queue: NotificationQueue;
  };
  operators?: Omit<OperatorsModuleOptions, 'planMappings'>;
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
        AuditEventsModule.register({
          authorizationRepository: options.organizations.repository,
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy,
          repository: options.auditEvents.repository,
        }),
        ApiKeysModule.register({
          authorizationRepository: options.organizations.repository,
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy,
          repository: options.apiKeys.repository,
        }),
        ...(options.files
          ? [
              FilesModule.register({
                authorizationRepository: options.organizations.repository,
                capabilityPolicy: options.capabilityPolicy,
                organizationStatePolicy,
                repository: options.files.repository,
                storage: options.files.storage,
              }),
            ]
          : []),
        ...(options.webhooks
          ? [
              WebhooksModule.register({
                authorizationRepository: options.organizations.repository,
                capabilityPolicy: options.capabilityPolicy,
                organizationStatePolicy,
                repository: options.webhooks.repository,
                queue: options.webhooks.queue,
              }),
            ]
          : []),
        ...(options.notifications
          ? [NotificationsModule.register(options.notifications)]
          : []),
        ...(options.operators
          ? [
              OperatorsModule.register({
                ...options.operators,
                planMappings: options.billing.planMappings,
                rateLimit: options.authentication.rateLimit,
              }),
            ]
          : []),
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
