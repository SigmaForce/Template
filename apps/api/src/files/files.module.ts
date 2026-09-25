import { type DynamicModule, Module } from '@nestjs/common';
import {
  AuthorizationRepository,
  type CapabilityPolicy,
  type OrganizationStatePolicy,
} from '../authorization/authorization.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { FileRepository, FileStorage } from './file.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

export interface FilesModuleOptions {
  authorizationRepository: AuthorizationRepository;
  capabilityPolicy?: CapabilityPolicy;
  organizationStatePolicy: OrganizationStatePolicy;
  repository: FileRepository;
  storage: FileStorage;
}

@Module({})
export class FilesModule {
  static register(options: FilesModuleOptions): DynamicModule {
    return {
      module: FilesModule,
      imports: [
        AuthorizationModule.register({
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy: options.organizationStatePolicy,
          repository: options.authorizationRepository,
        }),
      ],
      controllers: [FilesController],
      providers: [
        FilesService,
        { provide: FileRepository, useValue: options.repository },
        { provide: FileStorage, useValue: options.storage },
      ],
    };
  }
}
