import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './configure-api.js';
import { parseApiEnvironment } from '../../../scripts/environment-core.mjs';
import { JsonLogger } from '@saas/tooling-config/logging';
import {
  createPostgresProbe,
  createRedisProbe,
} from '@saas/tooling-config/readiness';
import { ClerkOrganizationDirectory } from './organizations/clerk-organization.directory.js';
import { PrismaOrganizationRepository } from './organizations/prisma-organization.repository.js';
import { PrismaBillingRepository } from './billing/prisma-billing.repository.js';
import { BullMqBillingProjectionQueue } from './billing/bullmq-billing-projection.queue.js';
import { StripeCheckoutGateway } from './billing/checkout.js';
import { SubscriptionCapabilityPolicy } from './billing/subscription-capability-policy.js';
import { StripeBillingPortalGateway } from './billing/portal.js';
import { PrismaAuditEventRepository } from './audit-events/prisma-audit-event.repository.js';
import { PrismaFileRepository } from './files/prisma-file.repository.js';
import { RailwayFileStorage } from './files/railway-file-storage.js';
import { PrismaApiKeyRepository } from './api-keys/prisma-api-key.repository.js';
import { PrismaWebhookRepository } from './webhooks/prisma-webhook.repository.js';
import { BullMqWebhookDeliveryQueue } from './webhooks/bullmq-webhook.queue.js';
import { JwtOperatorSessionVerifier } from './operators/jwt-operator-session.verifier.js';
import { PrismaOperatorSessionRepository } from './operators/prisma-operator-session.repository.js';
import { StripeSubscriptionAuthority } from './billing/subscription-reconciliation.js';
import { PostgresBillingProjectionRepository } from './billing/postgres-billing-projection.repository.js';

async function bootstrap() {
  const config = parseApiEnvironment(process.env);
  if (!config.authentication.secretKey) {
    throw new Error(
      'CLERK_SECRET_KEY is required for Organization management operations.',
    );
  }
  const logger = new JsonLogger({
    service: 'api',
    environment: config.environment,
    level: config.logLevel,
  });
  const billingRepository = new PrismaBillingRepository(
    config.databaseUrl.toString(),
  );
  const auditEventRepository = new PrismaAuditEventRepository(
    config.databaseUrl.toString(),
  );
  const organizationRepository = new PrismaOrganizationRepository(
    config.databaseUrl.toString(),
  );
  const app = await NestFactory.create(
    AppModule.register({
      apiKeys: {
        repository: new PrismaApiKeyRepository(config.databaseUrl.toString()),
      },
      auditEvents: { repository: auditEventRepository },
      authentication: config.authentication,
      capabilityPolicy: new SubscriptionCapabilityPolicy(billingRepository),
      files: {
        repository: new PrismaFileRepository(config.databaseUrl.toString()),
        storage: new RailwayFileStorage(config.bucket),
      },
      webhooks: {
        repository: new PrismaWebhookRepository(config.databaseUrl.toString()),
        queue: new BullMqWebhookDeliveryQueue(config.redisUrl),
      },
      ...(config.operatorAuthentication.status === 'configured'
        ? {
            operators: {
              authority: new StripeSubscriptionAuthority(
                config.stripeSecretKey,
                config.stripePlanMappings,
              ),
              projections: new PostgresBillingProjectionRepository(
                config.databaseUrl.toString(),
              ),
              sessionVerifier: new JwtOperatorSessionVerifier(
                config.operatorAuthentication.jwtKey,
                new PrismaOperatorSessionRepository(
                  config.databaseUrl.toString(),
                ),
              ),
            },
          }
        : {}),
      billing: {
        checkoutGateway: new StripeCheckoutGateway(config.stripeSecretKey),
        checkoutReturnOrigins: config.authentication.authorizedParties,
        planMappings: config.stripePlanMappings,
        portalGateway: new StripeBillingPortalGateway(
          config.stripeSecretKey,
          config.stripePortalConfigurationId,
        ),
        projectionQueue: new BullMqBillingProjectionQueue(config.redisUrl),
        repository: billingRepository,
        stripeWebhookSecret: config.stripeWebhookSecret,
      },
      organizations: {
        directory: new ClerkOrganizationDirectory(
          config.authentication.secretKey,
        ),
        onboarding: organizationRepository,
        repository: organizationRepository,
      },
    }),
    { logger, rawBody: true },
  );

  configureApi(app, {
    allowedOrigins: config.authentication.authorizedParties,
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
