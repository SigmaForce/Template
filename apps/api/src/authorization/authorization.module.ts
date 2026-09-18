import { type DynamicModule, Module } from '@nestjs/common';
import {
  AuthorizationRepository,
  CapabilityPolicy,
  FoundationCapabilityPolicy,
} from './authorization.js';
import { AuthorizationService } from './authorization.service.js';

export interface AuthorizationModuleOptions {
  capabilityPolicy?: CapabilityPolicy;
  repository: AuthorizationRepository;
}

@Module({})
export class AuthorizationModule {
  static register(options: AuthorizationModuleOptions): DynamicModule {
    return {
      module: AuthorizationModule,
      providers: [
        AuthorizationService,
        { provide: AuthorizationRepository, useValue: options.repository },
        {
          provide: CapabilityPolicy,
          useValue:
            options.capabilityPolicy ?? new FoundationCapabilityPolicy(),
        },
      ],
      exports: [AuthorizationService],
    };
  }
}
