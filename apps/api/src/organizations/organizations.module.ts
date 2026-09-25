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

export interface OrganizationModuleOptions {
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
