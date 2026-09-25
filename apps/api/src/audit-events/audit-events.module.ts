import { type DynamicModule, Global, Module } from '@nestjs/common';
import {
  AuthorizationRepository,
  type CapabilityPolicy,
  type OrganizationStatePolicy,
} from '../authorization/authorization.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditEventRepository } from './audit-event.js';
import { AuditEventsController } from './audit-events.controller.js';
import { AuditEventsService } from './audit-events.service.js';

export interface AuditEventsModuleOptions {
  authorizationRepository: AuthorizationRepository;
  capabilityPolicy?: CapabilityPolicy;
  organizationStatePolicy: OrganizationStatePolicy;
  repository: AuditEventRepository;
}

@Global()
@Module({})
export class AuditEventsModule {
  static register(options: AuditEventsModuleOptions): DynamicModule {
    return {
      module: AuditEventsModule,
      imports: [
        AuthorizationModule.register({
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy: options.organizationStatePolicy,
          repository: options.authorizationRepository,
        }),
      ],
      controllers: [AuditEventsController],
      providers: [
        AuditEventsService,
        { provide: AuditEventRepository, useValue: options.repository },
      ],
      exports: [AuditEventsService],
    };
  }
}
