import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './configure-api.js';
import { createOpenApiDocument } from './openapi.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from './organizations/memory-organizations.js';
import {
  MemoryBillingProjectionQueue,
  MemoryBillingRepository,
} from './billing/memory-billing.js';

export async function buildContractDocument() {
  const app = await NestFactory.create(
    AppModule.register({
      authentication: {
        authorizedParties: ['http://localhost:3000'],
        jwtKey: 'contract-generation-does-not-verify-tokens',
      },
      billing: {
        projectionQueue: new MemoryBillingProjectionQueue(),
        repository: new MemoryBillingRepository(),
        stripeWebhookSecret: 'whsec_contractGeneration',
      },
      organizations: {
        directory: new MemoryOrganizationDirectory(),
        repository: new MemoryOrganizationRepository(),
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
