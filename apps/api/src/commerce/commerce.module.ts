import { type DynamicModule, Module } from '@nestjs/common';
import { AuthorizationRepository } from '../authorization/authorization.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CommerceController } from './commerce.controller.js';
import { PlanCatalog, type StripePlanMappings } from './plan-catalog.js';

export interface CommerceModuleOptions {
  repository: AuthorizationRepository;
  stripePlanMappings: StripePlanMappings;
}

@Module({})
export class CommerceModule {
  static register(options: CommerceModuleOptions): DynamicModule {
    return {
      module: CommerceModule,
      imports: [
        AuthorizationModule.register({ repository: options.repository }),
      ],
      controllers: [CommerceController],
      providers: [
        {
          provide: PlanCatalog,
          useValue: new PlanCatalog(options.stripePlanMappings),
        },
      ],
    };
  }
}
