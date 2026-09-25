import { type DynamicModule, Global, Module } from '@nestjs/common';
import {
  AuthorizationRepository,
  type CapabilityPolicy,
  type OrganizationStatePolicy,
} from '../authorization/authorization.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { ApiKeyTokenVerifier } from '../authentication/authentication.js';
import { ApiKeyRepository } from './api-key.js';
import { ApiKeyVerifier } from './api-key.verifier.js';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysService } from './api-keys.service.js';

export interface ApiKeysModuleOptions {
  authorizationRepository: AuthorizationRepository;
  capabilityPolicy?: CapabilityPolicy;
  organizationStatePolicy: OrganizationStatePolicy;
  repository: ApiKeyRepository;
}

@Global()
@Module({})
export class ApiKeysModule {
  static register(options: ApiKeysModuleOptions): DynamicModule {
    return {
      module: ApiKeysModule,
      imports: [
        AuthorizationModule.register({
          capabilityPolicy: options.capabilityPolicy,
          organizationStatePolicy: options.organizationStatePolicy,
          repository: options.authorizationRepository,
        }),
      ],
      controllers: [ApiKeysController],
      providers: [
        ApiKeysService,
        ApiKeyVerifier,
        { provide: ApiKeyRepository, useValue: options.repository },
        { provide: ApiKeyTokenVerifier, useExisting: ApiKeyVerifier },
      ],
      exports: [ApiKeyTokenVerifier],
    };
  }
}
