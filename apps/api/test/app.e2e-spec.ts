import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApi } from './../src/configure-api.js';
import type { ReadinessCheck } from '@saas/tooling-config/readiness';
import { JsonLogger } from '@saas/tooling-config/logging';
import { generateKeyPairSync, sign } from 'node:crypto';

const {
  privateKey: authenticationPrivateKey,
  publicKey: authenticationPublicKey,
} = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

function createSessionToken({
  authorizedParty = 'http://localhost:3000',
  expiresAt = Math.floor(Date.now() / 1000) + 60,
  userId = 'user_verified',
}: {
  authorizedParty?: string;
  expiresAt?: number;
  userId?: string;
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      azp: authorizedParty,
      exp: expiresAt,
      iat: now,
      iss: 'https://test.clerk.accounts.dev',
      nbf: now - 1,
      sid: 'sess_test',
      sub: userId,
    }),
  ).toString('base64url');
  const unsignedToken = `${header}.${payload}`;
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(unsignedToken),
    authenticationPrivateKey,
  ).toString('base64url');

  return `${unsignedToken}.${signature}`;
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  async function createApp(
    readinessChecks: ReadinessCheck[] = [],
    logger?: JsonLogger,
  ) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule.register({
          authorizedParties: ['http://localhost:3000'],
          jwtKey: authenticationPublicKey,
        }),
      ],
    }).compile();

    const testApp = moduleFixture.createNestApplication();
    configureApi(testApp, { readinessChecks, logger });
    await testApp.init();

    return testApp;
  }

  beforeEach(async () => {
    app = await createApp();
  });

  it('exposes health inside the stable v1 boundary', () => {
    return request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect({ service: 'api', status: 'healthy' });
  });

  it('rejects a protected identity request without a Bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .expect('content-type', /application\/problem\+json/)
      .expect(401);

    expect(response.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:authentication-required',
      title: 'Authentication required',
      status: 401,
      detail: 'A valid session token is required.',
      instance: expect.stringMatching(/^urn:uuid:/),
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /authorization|bearer|stack|clerk/i,
    );
  });

  it('derives the User only from the verified token', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/auth/me?userId=user_from_query')
      .set('authorization', `Bearer ${createSessionToken()}`)
      .set('x-user-id', 'user_from_header')
      .send({ userId: 'user_from_body' })
      .expect(200);

    expect(response.body).toEqual({ id: 'user_verified' });
  });

  it.each([
    {
      name: 'invalid',
      token: () => {
        const token = createSessionToken();
        return `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
      },
    },
    {
      name: 'expired',
      token: () =>
        createSessionToken({
          expiresAt: Math.floor(Date.now() / 1000) - 60,
        }),
    },
    {
      name: 'issued for an unauthorized origin',
      token: () =>
        createSessionToken({ authorizedParty: 'https://attacker.example' }),
    },
  ])('rejects a $name session token safely', async ({ token }) => {
    const sessionToken = token();
    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('authorization', `Bearer ${sessionToken}`)
      .expect('content-type', /application\/problem\+json/)
      .expect(401);

    expect(response.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:authentication-required',
      title: 'Authentication required',
      status: 401,
      detail: 'A valid session token is required.',
    });
    expect(JSON.stringify(response.body)).not.toContain(sessionToken);
    expect(JSON.stringify(response.body)).not.toMatch(/stack|clerk|signature/i);
  });

  it('assigns and safely preserves correlation identifiers', async () => {
    const assigned = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200);

    expect(assigned.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    const preserved = await request(app.getHttpServer())
      .get('/v1/contract-examples?limit=101')
      .set('x-correlation-id', 'web-01JQK3J8W8G8ZM6MJR7GQ2R9NN')
      .expect(400);

    expect(preserved.headers['x-correlation-id']).toBe(
      'web-01JQK3J8W8G8ZM6MJR7GQ2R9NN',
    );
    expect(preserved.body.correlationId).toBe('web-01JQK3J8W8G8ZM6MJR7GQ2R9NN');

    const replaced = await request(app.getHttpServer())
      .get('/v1/health')
      .set('x-correlation-id', 'unsafe value')
      .expect(200);

    expect(replaced.headers['x-correlation-id']).not.toContain('unsafe');
  });

  it('reports optional dependency failures as degraded while remaining ready', async () => {
    await app.close();
    app = await createApp([
      {
        name: 'database',
        critical: true,
        probe: async () => undefined,
      },
      {
        name: 'redis',
        critical: false,
        probe: async () => {
          throw new Error('redis://username:password@internal.example');
        },
      },
      { name: 'posthog', critical: false },
      { name: 'sentry', critical: false },
    ]);

    const response = await request(app.getHttpServer())
      .get('/v1/ready')
      .expect(200);

    expect(response.body).toEqual({
      service: 'api',
      status: 'degraded',
      dependencies: [
        { name: 'database', critical: true, status: 'up' },
        { name: 'redis', critical: false, status: 'down' },
        { name: 'posthog', critical: false, status: 'disabled' },
        { name: 'sentry', critical: false, status: 'disabled' },
      ],
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /username|password|internal\.example/i,
    );
  });

  it('refuses readiness when a critical dependency is unavailable', async () => {
    await app.close();
    app = await createApp([
      {
        name: 'database',
        critical: true,
        probe: async () => {
          throw new Error('database unavailable');
        },
      },
      {
        name: 'redis',
        critical: false,
        probe: async () => undefined,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/v1/ready')
      .expect(503);

    expect(response.body).toMatchObject({
      service: 'api',
      status: 'unready',
      dependencies: expect.arrayContaining([
        { name: 'database', critical: true, status: 'down' },
      ]),
    });

    await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect({ service: 'api', status: 'healthy' });
  });

  it('writes correlated JSON request logs without secrets or known PII', async () => {
    const lines: string[] = [];
    const logger = new JsonLogger({
      service: 'api',
      environment: 'test',
      level: 'debug',
      write: (line) => lines.push(line),
    });

    await app.close();
    app = await createApp([], logger);

    await request(app.getHttpServer())
      .get('/v1/contract-examples?token=query-secret')
      .set('x-correlation-id', 'web-log-correlation')
      .set('authorization', 'Bearer header-secret')
      .set('cookie', 'session=cookie-secret')
      .expect(400);

    logger.warn(
      {
        event: 'redaction.example',
        email: 'person@example.com',
        nested: {
          apiKey: 'api-key-secret',
          signature: 'signature-secret',
          payload: 'sensitive-payload',
        },
      },
      'RedactionContract',
    );

    const records = lines.map((line) => JSON.parse(line));
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'info',
          service: 'api',
          environment: 'test',
          event: 'request.completed',
          correlationId: 'web-log-correlation',
          method: 'GET',
          path: '/v1/contract-examples',
          statusCode: 400,
          outcome: 'client_error',
          durationMs: expect.any(Number),
        }),
      ]),
    );
    expect(records.at(-1)?.message).toMatchObject({
      email: '[REDACTED]',
      nested: {
        apiKey: '[REDACTED]',
        signature: '[REDACTED]',
        payload: '[REDACTED]',
      },
    });
    expect(lines.join('\n')).not.toMatch(
      /query-secret|header-secret|cookie-secret|person@example\.com|api-key-secret|signature-secret|sensitive-payload/,
    );
  });

  it('publishes stable operation identifiers in its OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/openapi.json')
      .expect(200);

    expect(response.body.paths['/v1/contract-examples'].get.operationId).toBe(
      'listContractExamples',
    );
    expect(response.body.paths['/v1/health'].get.operationId).toBe('getHealth');
    expect(response.body.paths['/v1/ready'].get.operationId).toBe(
      'getReadiness',
    );
    expect(response.body.paths['/v1/auth/me'].get).toMatchObject({
      operationId: 'getAuthenticatedUser',
      security: [{ 'clerk-session': [] }],
      responses: {
        401: {
          content: {
            'application/problem+json': expect.any(Object),
          },
        },
      },
    });
    expect(
      response.body.paths['/v1/contract-examples'].get.parameters.find(
        (parameter: { name: string }) => parameter.name === 'limit',
      ).schema,
    ).toMatchObject({ type: 'integer', minimum: 1, maximum: 100 });
  });

  it('lists convention examples using an opaque cursor without a total', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/v1/contract-examples')
      .query({ currency: 'BRL', limit: 1 })
      .expect(200);

    expect(firstPage.body.items).toEqual([
      {
        id: '018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1001',
        name: 'Foundation contract',
        createdAt: '2026-01-15T14:30:00.000Z',
        businessDate: '2026-01-15',
        localBusinessTime: {
          localTime: '09:30:00',
          timeZone: 'America/Cuiaba',
        },
        price: { amountMinor: '4900', currency: 'BRL' },
        retiredAt: null,
      },
    ]);
    expect(firstPage.body.pageInfo).toEqual({
      hasNextPage: true,
      nextCursor: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
    });
    expect(firstPage.body).not.toHaveProperty('total');
    expect(firstPage.body.pageInfo.nextCursor).not.toContain(
      firstPage.body.items[0].id,
    );

    const secondPage = await request(app.getHttpServer())
      .get('/v1/contract-examples')
      .query({
        currency: 'BRL',
        cursor: firstPage.body.pageInfo.nextCursor,
        limit: 1,
      })
      .expect(200);

    expect(secondPage.body.items[0].id).toBe(
      '018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1002',
    );
  });

  it('rejects an invalid limit with safe RFC 9457 Problem Details', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/contract-examples?limit=101&token=do-not-leak')
      .expect('content-type', /application\/problem\+json/)
      .expect(400);

    expect(response.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:validation',
      title: 'Request validation failed',
      status: 400,
      detail: 'One or more request values are invalid.',
      instance: expect.stringMatching(/^urn:uuid:/),
      errors: expect.arrayContaining([
        {
          pointer: '#/query/limit',
          detail: expect.any(String),
        },
      ]),
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /do-not-leak|stack|ValidationPipe/i,
    );
  });

  it('rejects a cursor reused with different filters', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/v1/contract-examples')
      .query({ currency: 'BRL', limit: 1 })
      .expect(200);

    await request(app.getHttpServer())
      .get('/v1/contract-examples')
      .query({
        currency: 'USD',
        cursor: firstPage.body.pageInfo.nextCursor,
        limit: 1,
      })
      .expect('content-type', /application\/problem\+json/)
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
