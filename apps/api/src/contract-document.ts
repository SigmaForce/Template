import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './configure-api.js';
import { createOpenApiDocument } from './openapi.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from './organizations/memory-organizations.js';

export async function buildContractDocument() {
  const app = await NestFactory.create(
    AppModule.register({
      authentication: {
        authorizedParties: ['http://localhost:3000'],
        jwtKey: 'contract-generation-does-not-verify-tokens',
      },
      commerce: {
        stripePlanMappings: {
          launch: {
            priceId: 'price_launchContract',
            productId: 'prod_launchContract',
          },
          scale: {
            priceId: 'price_scaleContract',
            productId: 'prod_scaleContract',
          },
        },
      },
      organizations: {
        directory: new MemoryOrganizationDirectory(),
        repository: new MemoryOrganizationRepository(),
      },
    }),
    { logger: false },
  );

  try {
    configureApi(app);
    await app.init();
    return createOpenApiDocument(app);
  } finally {
    await app.close();
  }
}
