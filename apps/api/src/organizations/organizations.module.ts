import { type DynamicModule, Module } from '@nestjs/common';
import {
  OrganizationDirectory,
  OrganizationRepository,
} from './organization.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { InvitationsController } from './invitations.controller.js';

export interface OrganizationModuleOptions {
  directory: OrganizationDirectory;
  repository: OrganizationRepository;
}

@Module({})
export class OrganizationsModule {
  static register(options: OrganizationModuleOptions): DynamicModule {
    return {
      module: OrganizationsModule,
      imports: [
        AuthorizationModule.register({ repository: options.repository }),
      ],
      controllers: [InvitationsController, OrganizationsController],
      providers: [
        OrganizationsService,
        { provide: OrganizationDirectory, useValue: options.directory },
        { provide: OrganizationRepository, useValue: options.repository },
      ],
    };
  }
}
