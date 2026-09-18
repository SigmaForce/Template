import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureWorker } from './configure-worker.js';
import { parseWorkerEnvironment } from '../../../scripts/environment-core.mjs';
import { JsonLogger } from '@saas/tooling-config/logging';
import {
  createPostgresProbe,
  createRedisProbe,
} from '@saas/tooling-config/readiness';

async function bootstrap() {
  const config = parseWorkerEnvironment(process.env);
  const logger = new JsonLogger({
    service: 'worker',
    environment: config.environment,
    level: config.logLevel,
  });
  const app = await NestFactory.create(AppModule, { logger });

  configureWorker(app, {
    logger,
    readinessChecks: [
      {
        name: 'database',
        critical: true,
        probe: createPostgresProbe(config.databaseUrl),
      },
      {
        name: 'redis',
        critical: true,
        probe: createRedisProbe(config.redisUrl),
      },
      {
        name: 'posthog',
        critical: false,
        status: config.telemetry.posthog.status,
      },
      {
        name: 'sentry',
        critical: false,
        status: config.telemetry.sentry.status,
      },
    ],
  });
  await app.listen(config.port);
}

try {
  await bootstrap();
} catch (error) {
  const logger = new JsonLogger({
    service: 'worker',
    environment: 'development',
    level: 'error',
    write: (line) => process.stderr.write(`${line}\n`),
  });
  logger.error({ event: 'startup.failed', error }, 'Bootstrap');
  process.exitCode = 1;
}
