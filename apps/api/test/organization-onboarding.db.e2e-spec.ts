import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApi } from '../src/configure-api.js';
import { MemoryOrganizationDirectory } from '../src/organizations/memory-organizations.js';
import { PrismaOrganizationRepository } from '../src/organizations/prisma-organization.repository.js';
import {
  authenticationPublicKey,
  createSessionToken,
} from './session-token.js';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Organization onboarding with PostgreSQL', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl });
  });

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE organization_onboarding_requests, memberships, organizations CASCADE',
    );
    const repository = new PrismaOrganizationRepository(databaseUrl!);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule.register({
          authentication: {
            authorizedParties: ['http://localhost:3000'],
            jwtKey: authenticationPublicKey,
          },
          organizations: {
            directory: new MemoryOrganizationDirectory(),
            repository,
          },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApi(app);
    await app.init();
  });

  it('commits Organization, Owner Membership, and replay state atomically', async () => {
    const authorization = `Bearer ${createSessionToken()}`;
    const input = {
      name: 'Postgres Foundation',
      slug: 'postgres-foundation',
      locale: 'pt-BR',
      timeZone: 'America/Cuiaba',
    };

    const first = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', 'postgres-onboarding')
      .send(input)
      .expect(201);

    const replay = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', 'postgres-onboarding')
      .send(input)
      .expect(201);

    expect(replay.body).toEqual(first.body);
    await request(app.getHttpServer())
      .get('/v1/organizations/onboarding')
      .set('authorization', authorization)
      .expect(200)
      .expect({ status: 'complete', ...first.body });
  });

  it('enforces the permission pipeline against the PostgreSQL Membership projection', async () => {
    const userId = 'user_postgres_authorization';
    const creation = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', `Bearer ${createSessionToken({ userId })}`)
      .set('idempotency-key', 'postgres-authorization')
      .send({
        name: 'Postgres Authorization',
        slug: 'postgres-authorization',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      })
      .expect(201);
    const organization = creation.body.organization as {
      id: string;
      slug: string;
    };
    const authorization = `Bearer ${createSessionToken({
      userId,
      organization,
      organizationRole: 'owner',
    })}`;

    await request(app.getHttpServer())
      .patch(`/v1/organizations/${organization.id}/settings`)
      .set('authorization', authorization)
      .send({ locale: 'en-US', timeZone: 'UTC' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: organization.id,
          locale: 'en-US',
          timeZone: 'UTC',
        });
      });

    await request(app.getHttpServer())
      .patch(`/v1/organizations/${organization.id}/settings`)
      .set(
        'authorization',
        `Bearer ${createSessionToken({
          userId,
          organization,
          organizationRole: 'member',
        })}`,
      )
      .send({ locale: 'pt-BR', timeZone: 'America/Cuiaba' })
      .expect(403);

    const otherCreation = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set(
        'authorization',
        `Bearer ${createSessionToken({ userId: 'user_other_postgres' })}`,
      )
      .set('idempotency-key', 'postgres-other-organization')
      .send({
        name: 'Other PostgreSQL Organization',
        slug: 'other-postgres-organization',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(
        `/v1/organizations/${otherCreation.body.organization.id as string}/settings`,
      )
      .set('authorization', authorization)
      .send({ locale: 'pt-BR', timeZone: 'America/Cuiaba' })
      .expect(403);

    await pool.query(
      "UPDATE memberships SET status = 'SUSPENDED' WHERE organization_id = $1 AND user_id = $2",
      [organization.id, userId],
    );

    await request(app.getHttpServer())
      .patch(`/v1/organizations/${organization.id}/settings`)
      .set('authorization', authorization)
      .send({ locale: 'pt-BR', timeZone: 'America/Cuiaba' })
      .expect(403)
      .expect((response) => {
        expect(response.body).toMatchObject({
          type: 'urn:problem:next-nest-saas-starter:permission-denied',
          status: 403,
        });
      });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await pool.end();
  });
});
