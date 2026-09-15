import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApi } from './configure-api.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 4000);

  configureApi(app);
  await app.listen(port);
}
await bootstrap();
