import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './configure-api.js';
import { createOpenApiDocument } from './openapi.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from './organizations/memory-organizations.js';
import { MemoryOrganizationOnboardingUnitOfWork } from './application/organization-onboarding.js';
import {
  MemoryBillingProjectionQueue,
  MemoryBillingRepository,
} from './billing/memory-billing.js';
import { MemoryBillingCheckoutGateway } from './billing/checkout.js';
import { MemoryBillingPortalGateway } from './billing/portal.js';
import { MemoryAuditEventRepository } from './audit-events/memory-audit-events.js';
import {
  MemoryFileRepository,
  MemoryFileStorage,
} from './files/memory-files.js';
import { MemoryApiKeyRepository } from './api-keys/memory-api-keys.js';

export async function buildContractDocument() {
  const organizationRepository = new MemoryOrganizationRepository();
  const app = await NestFactory.create(
    AppModule.register({
      apiKeys: { repository: new MemoryApiKeyRepository() },
      auditEvents: { repository: new MemoryAuditEventRepository() },
      files: {
        repository: new MemoryFileRepository(),
        storage: new MemoryFileStorage(),
      },
      authentication: {
        authorizedParties: ['http://localhost:3000'],
        jwtKey: 'contract-generation-does-not-verify-tokens',
      },
      billing: {
        checkoutGateway: new MemoryBillingCheckoutGateway(),
        checkoutReturnOrigins: ['http://localhost:3000'],
        planMappings: {
          launch: { priceId: 'price_launchTest', productId: 'prod_launchTest' },
          scale: { priceId: 'price_scaleTest', productId: 'prod_scaleTest' },
        },
        portalGateway: new MemoryBillingPortalGateway(),
        projectionQueue: new MemoryBillingProjectionQueue(),
        repository: new MemoryBillingRepository(),
        stripeWebhookSecret: 'whsec_contractGeneration',
      },
      organizations: {
        directory: new MemoryOrganizationDirectory(),
        onboarding: new MemoryOrganizationOnboardingUnitOfWork(
          (record) => organizationRepository.reserveOnboarding(record),
          (record) => organizationRepository.completeOnboarding(record),
          (record) =>
            organizationRepository.releaseOnboardingReservation(record),
          new MemoryAuditEventRepository(),
        ),
        repository: organizationRepository,
      },
    }),
    { logger: false, rawBody: true },
  );

  try {
    configureApi(app);
    await app.init();
    return createOpenApiDocument(app);
  } finally {
    await app.close();
  }
}
