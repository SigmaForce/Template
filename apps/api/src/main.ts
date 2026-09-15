import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './configure-api.js';
import { parseApiEnvironment } from '../../../scripts/environment-core.mjs';
import { JsonLogger } from '@saas/tooling-config/logging';
import {
  createPostgresProbe,
  createRedisProbe,
} from '@saas/tooling-config/readiness';

async function bootstrap() {
  const config = parseApiEnvironment(process.env);
  const logger = new JsonLogger({
    service: 'api',
    environment: config.environment,
    level: config.logLevel,
  });
  const app = await NestFactory.create(AppModule, { logger });

  configureApi(app, {
    logger,
    readinessChecks: [
      {
        name: 'database',
        critical: true,
        probe: createPostgresProbe(config.databaseUrl),
      },
      {
        name: 'redis',
        critical: false,
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
    service: 'api',
    environment: 'development',
    level: 'error',
    write: (line) => process.stderr.write(`${line}\n`),
  });
  logger.error({ event: 'startup.failed', error }, 'Bootstrap');
  process.exitCode = 1;
}
