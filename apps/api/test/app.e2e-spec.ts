import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApi } from './../src/configure-api.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApi(app);
    await app.init();
  });

  it('exposes health inside the stable v1 boundary', () => {
    return request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect({ service: 'api', status: 'ok' });
  });

  it('publishes stable operation identifiers in its OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/openapi.json')
      .expect(200);

    expect(response.body.paths['/v1/contract-examples'].get.operationId).toBe(
      'listContractExamples',
    );
    expect(response.body.paths['/v1/health'].get.operationId).toBe('getHealth');
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
