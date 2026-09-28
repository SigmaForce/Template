import { type DynamicModule, Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import type {
  AuthorizationRepository,
  CapabilityPolicy,
  OrganizationStatePolicy,
} from '../authorization/authorization.js';
import { WebhookRepository, WebhookDeliveryQueue } from './webhook.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

export interface WebhooksModuleOptions {
  authorizationRepository: AuthorizationRepository;
  capabilityPolicy?: CapabilityPolicy;
  organizationStatePolicy: OrganizationStatePolicy;
  repository: WebhookRepository;
  queue: WebhookDeliveryQueue;
}
@Module({})
export class WebhooksModule {
  static register(options: WebhooksModuleOptions): DynamicModule {
    return {
      module: WebhooksModule,
      imports: [
        AuthorizationModule.register({
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy: options.organizationStatePolicy,
          repository: options.authorizationRepository,
        }),
      ],
      controllers: [WebhooksController],
      providers: [
        WebhooksService,
        { provide: WebhookRepository, useValue: options.repository },
        { provide: WebhookDeliveryQueue, useValue: options.queue },
      ],
      exports: [WebhooksService],
    };
  }
}
