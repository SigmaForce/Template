import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { ReadinessService } from '@saas/tooling-config/readiness';

@Module({
  imports: [],
  controllers: [AppController, ReadinessController],
  providers: [
    {
      provide: ReadinessService,
      useFactory: () => new ReadinessService('worker'),
    },
  ],
})
export class AppModule {}
