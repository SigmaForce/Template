import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ContractExamplesController } from './contract-examples/contract-examples.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { ReadinessService } from '@saas/tooling-config/readiness';

@Module({
  imports: [],
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
})
export class AppModule {}
