import { type DynamicModule, Module } from '@nestjs/common';
import {
  OrganizationDirectory,
  OrganizationRepository,
  SeatAllowancePolicy,
} from './organization.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { InvitationsController } from './invitations.controller.js';
import { MembershipsController } from './memberships.controller.js';
import { MembershipsService } from './memberships.service.js';
import type {
  CapabilityPolicy,
  OrganizationStatePolicy,
} from '../authorization/authorization.js';
import { AuditEventsModule } from '../audit-events/audit-events.module.js';
import type { AuditEventRepository } from '../audit-events/audit-event.js';

export interface OrganizationModuleOptions {
  auditEventRepository: AuditEventRepository;
  directory: OrganizationDirectory;
  repository: OrganizationRepository;
  capabilityPolicy?: CapabilityPolicy;
  organizationStatePolicy: OrganizationStatePolicy;
  seatAllowancePolicy: SeatAllowancePolicy;
}

@Module({})
export class OrganizationsModule {
  static register(options: OrganizationModuleOptions): DynamicModule {
    return {
      module: OrganizationsModule,
      imports: [
        AuthorizationModule.register({
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy: options.organizationStatePolicy,
          repository: options.repository,
        }),
        AuditEventsModule.register({
          authorizationRepository: options.repository,
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy: options.organizationStatePolicy,
          repository: options.auditEventRepository,
        }),
      ],
      controllers: [
        InvitationsController,
        MembershipsController,
        OrganizationsController,
      ],
      providers: [
        MembershipsService,
        OrganizationsService,
        { provide: OrganizationDirectory, useValue: options.directory },
        { provide: OrganizationRepository, useValue: options.repository },
        {
          provide: SeatAllowancePolicy,
          useValue: options.seatAllowancePolicy,
        },
      ],
    };
  }
}
