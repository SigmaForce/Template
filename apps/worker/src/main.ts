import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.WORKER_PORT ?? 4001);

  await app.listen(port);
}
await bootstrap();
