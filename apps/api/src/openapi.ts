import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

const openApiConfiguration = new DocumentBuilder()
  .setTitle('Next Nest SaaS Starter API')
  .setDescription('Stable HTTP contract for the SaaS foundation.')
  .setVersion('1.0.0')
  .build();

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, openApiConfiguration, {
    autoTagControllers: false,
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });
}

export function exposeOpenApi(app: INestApplication) {
  SwaggerModule.setup('v1/docs', app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: 'v1/openapi.json',
  });
}
