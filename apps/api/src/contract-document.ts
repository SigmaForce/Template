import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './configure-api.js';
import { createOpenApiDocument } from './openapi.js';

export async function buildContractDocument() {
  const app = await NestFactory.create(
    AppModule.register({
      authorizedParties: ['http://localhost:3000'],
      jwtKey: 'contract-generation-does-not-verify-tokens',
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
