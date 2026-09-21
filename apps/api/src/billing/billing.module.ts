import { type DynamicModule, Module } from '@nestjs/common';
import { AuthorizationRepository } from '../authorization/authorization.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { BillingController } from './billing.controller.js';

export interface BillingModuleOptions {
  repository: AuthorizationRepository;
}

@Module({})
export class BillingModule {
  static register(options: BillingModuleOptions): DynamicModule {
    return {
      module: BillingModule,
      imports: [
        AuthorizationModule.register({ repository: options.repository }),
      ],
      controllers: [BillingController],
    };
  }
}
