import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureWorker } from './../src/configure-worker.js';
import type { ReadinessCheck } from '@saas/tooling-config/readiness';
import { JsonLogger } from '@saas/tooling-config/logging';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  async function createApp(
    readinessChecks: ReadinessCheck[] = [],
    logger?: JsonLogger,
  ) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const testApp = moduleFixture.createNestApplication();
    configureWorker(testApp, { readinessChecks, logger });
    await testApp.init();

    return testApp;
  }

  beforeEach(async () => {
    app = await createApp();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ service: 'worker', status: 'healthy' });
  });

  it('preserves a safe correlation ID on every response', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-correlation-id', 'api-01JQK3J8W8G8ZM6MJR7GQ2R9NN')
      .expect(200);

    expect(response.headers['x-correlation-id']).toBe(
      'api-01JQK3J8W8G8ZM6MJR7GQ2R9NN',
    );
  });

  it('refuses readiness when its queue dependency is unavailable', async () => {
    await app.close();
    app = await createApp([
      {
        name: 'database',
        critical: true,
        probe: async () => undefined,
      },
      {
        name: 'redis',
        critical: true,
        probe: async () => {
          throw new Error('redis unavailable');
        },
      },
      { name: 'posthog', critical: false },
      { name: 'sentry', critical: false },
    ]);

    const response = await request(app.getHttpServer())
      .get('/ready')
      .expect(503);

    expect(response.body).toEqual({
      service: 'worker',
      status: 'unready',
      dependencies: [
        { name: 'database', critical: true, status: 'up' },
        { name: 'redis', critical: true, status: 'down' },
        { name: 'posthog', critical: false, status: 'disabled' },
        { name: 'sentry', critical: false, status: 'disabled' },
      ],
    });
  });

  it('writes a structured result linked to the incoming correlation ID', async () => {
    const lines: string[] = [];
    const logger = new JsonLogger({
      service: 'worker',
      environment: 'test',
      level: 'info',
      write: (line) => lines.push(line),
    });

    await app.close();
    app = await createApp([], logger);

    await request(app.getHttpServer())
      .get('/health')
      .set('x-correlation-id', 'api-to-worker-correlation')
      .expect(200);

    expect(lines.map((line) => JSON.parse(line))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'info',
          service: 'worker',
          environment: 'test',
          event: 'request.completed',
          correlationId: 'api-to-worker-correlation',
          method: 'GET',
          path: '/health',
          statusCode: 200,
          outcome: 'success',
        }),
      ]),
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
