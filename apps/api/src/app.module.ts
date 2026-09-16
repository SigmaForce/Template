import { type DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ContractExamplesController } from './contract-examples/contract-examples.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { ReadinessService } from '@saas/tooling-config/readiness';
import { AuthenticationModule } from './authentication/authentication.module.js';
import type { AuthenticationOptions } from './authentication/authentication.js';

@Module({})
export class AppModule {
  static register(authentication: AuthenticationOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [AuthenticationModule.register(authentication)],
      controllers: [
        AppController,
        ContractExamplesController,
        ReadinessController,
      ],
      providers: [
        {
          provide: ReadinessService,
          useFactory: () => new ReadinessService('api'),
        },
      ],
    };
  }
}
