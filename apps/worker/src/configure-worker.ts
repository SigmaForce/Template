import type { INestApplication } from '@nestjs/common';
import {
  ReadinessService,
  type ReadinessCheck,
} from '@saas/tooling-config/readiness';
import {
  correlationIdMiddleware,
  createRequestLoggingMiddleware,
} from '@saas/tooling-config/http';
import type { JsonLogger } from '@saas/tooling-config/logging';

export interface ConfigureWorkerOptions {
  readinessChecks?: ReadinessCheck[];
  logger?: JsonLogger;
}

export function configureWorker(
  app: INestApplication,
  { readinessChecks = [], logger }: ConfigureWorkerOptions = {},
) {
  app.use(correlationIdMiddleware);
  if (logger) {
    app.useLogger(logger);
    app.use(createRequestLoggingMiddleware(logger));
  }
  app.get(ReadinessService).configure(readinessChecks);
}
