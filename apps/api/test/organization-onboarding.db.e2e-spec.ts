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
import {
  MemoryBillingProjectionQueue,
  MemoryBillingRepository,
} from '../src/billing/memory-billing.js';

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
          billing: {
            projectionQueue: new MemoryBillingProjectionQueue(),
            repository: new MemoryBillingRepository(),
            stripeWebhookSecret: 'whsec_testWebhookSecret',
          },
          organizations: {
            directory: new MemoryOrganizationDirectory(),
            repository,
          },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
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

  it('persists profile changes and serializes competing slug claims', async () => {
    const createOrganization = async (slug: string) => {
      const userId = `user_${slug}`;
      const response = await request(app.getHttpServer())
        .post('/v1/organizations')
        .set('authorization', `Bearer ${createSessionToken({ userId })}`)
        .set('idempotency-key', `postgres-settings-${slug}`)
        .send({ name: `${slug} org`, slug, locale: 'en-US', timeZone: 'UTC' })
        .expect(201);
      const organization = response.body.organization as {
        id: string;
        slug: string;
      };
      return {
        organization,
        authorization: `Bearer ${createSessionToken({
          userId,
          organization,
          organizationRole: 'owner',
        })}`,
      };
    };
    const alpha = await createOrganization('postgres-alpha');
    const beta = await createOrganization('postgres-beta');

    await request(app.getHttpServer())
      .patch(`/v1/organizations/${alpha.organization.id}/settings`)
      .set('authorization', alpha.authorization)
      .send({
        billingContactEmail: 'billing@alpha.test',
        name: 'Postgres Alpha',
        slug: 'postgres-alpha-new',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          billingContactEmail: 'billing@alpha.test',
          id: alpha.organization.id,
          name: 'Postgres Alpha',
          slug: 'postgres-alpha-new',
        });
      });

    await request(app.getHttpServer())
      .get('/v1/organizations/by-slug/postgres-alpha')
      .set('authorization', alpha.authorization)
      .expect(200)
      .expect({
        id: alpha.organization.id,
        slug: 'postgres-alpha-new',
      });

    await request(app.getHttpServer())
      .patch(`/v1/organizations/${beta.organization.id}/settings`)
      .set('authorization', beta.authorization)
      .send({ slug: 'postgres-alpha' })
      .expect(409);

    const contenders = await Promise.all([
      request(app.getHttpServer())
        .patch(`/v1/organizations/${alpha.organization.id}/settings`)
        .set('authorization', alpha.authorization)
        .send({ slug: 'postgres-shared' }),
      request(app.getHttpServer())
        .patch(`/v1/organizations/${beta.organization.id}/settings`)
        .set('authorization', beta.authorization)
        .send({ slug: 'postgres-shared' }),
    ]);
    expect(contenders.map(({ status }) => status).sort()).toEqual([200, 409]);

    const current = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM organizations WHERE slug = $1',
      ['postgres-shared'],
    );
    const reservation = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM organization_slugs WHERE slug = $1',
      ['postgres-shared'],
    );
    expect(current.rows[0]?.count).toBe('1');
    expect(reservation.rows[0]?.count).toBe('1');
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
    await request(app.getHttpServer())
      .get(
        `/v1/organizations/${otherCreation.body.organization.id as string}/settings`,
      )
      .set('authorization', authorization)
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

  it('keeps PostgreSQL Organization resources isolated after cross-Organization, suspended, and removed access attempts', async () => {
    const createOrganization = async (slug: string) => {
      const userId = `user_${slug}`;
      const creation = await request(app.getHttpServer())
        .post('/v1/organizations')
        .set('authorization', `Bearer ${createSessionToken({ userId })}`)
        .set('idempotency-key', `postgres-isolation-${slug}`)
        .send({
          name: `${slug} Organization`,
          slug,
          locale: 'en-US',
          timeZone: 'UTC',
        })
        .expect(201);
      const organization = creation.body.organization as {
        id: string;
        slug: string;
      };
      return {
        organization,
        userId,
        authorization: `Bearer ${createSessionToken({
          userId,
          organization,
          organizationRole: 'owner',
        })}`,
      };
    };
    const alpha = await createOrganization('postgres-isolation-alpha');
    const beta = await createOrganization('postgres-isolation-beta');
    const betaInvitation = await request(app.getHttpServer())
      .post(`/v1/organizations/${beta.organization.id}/invitations`)
      .set('authorization', beta.authorization)
      .send({ emailAddress: 'member@beta.test', role: 'member' })
      .expect(201);

    const crossOrganization = await Promise.all([
      request(app.getHttpServer())
        .get(`/v1/organizations/${beta.organization.id}/settings`)
        .set('authorization', alpha.authorization),
      request(app.getHttpServer())
        .patch(`/v1/organizations/${beta.organization.id}/settings`)
        .set('authorization', alpha.authorization)
        .send({ locale: 'pt-BR' }),
      request(app.getHttpServer())
        .get(`/v1/organizations/${beta.organization.id}/memberships`)
        .set('authorization', alpha.authorization),
      request(app.getHttpServer())
        .patch(
          `/v1/organizations/${beta.organization.id}/memberships/${beta.userId}`,
        )
        .set('authorization', alpha.authorization)
        .send({ role: 'member' }),
      request(app.getHttpServer())
        .delete(
          `/v1/organizations/${beta.organization.id}/memberships/${beta.userId}`,
        )
        .set('authorization', alpha.authorization),
      request(app.getHttpServer())
        .get(`/v1/organizations/${beta.organization.id}/invitations`)
        .set('authorization', alpha.authorization),
      request(app.getHttpServer())
        .post(`/v1/organizations/${beta.organization.id}/invitations`)
        .set('authorization', alpha.authorization)
        .send({ emailAddress: 'cross-organization@beta.test', role: 'member' }),
      request(app.getHttpServer())
        .delete(
          `/v1/organizations/${beta.organization.id}/invitations/${betaInvitation.body.id as string}`,
        )
        .set('authorization', alpha.authorization),
    ]);
    for (const response of crossOrganization) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        type: 'urn:problem:next-nest-saas-starter:permission-denied',
        status: 403,
      });
      expect(JSON.stringify(response.body)).not.toContain(beta.organization.id);
    }

    for (const status of ['SUSPENDED', 'REMOVED'] as const) {
      await pool.query(
        'UPDATE memberships SET status = $1 WHERE organization_id = $2 AND user_id = $3',
        [status, alpha.organization.id, alpha.userId],
      );
      const lostAccess = await Promise.all([
        request(app.getHttpServer())
          .get('/v1/organizations/active')
          .set('authorization', alpha.authorization),
        request(app.getHttpServer())
          .get(`/v1/organizations/${alpha.organization.id}/settings`)
          .set('authorization', alpha.authorization),
        request(app.getHttpServer())
          .patch(`/v1/organizations/${alpha.organization.id}/settings`)
          .set('authorization', alpha.authorization)
          .send({ locale: 'pt-BR' }),
        request(app.getHttpServer())
          .get(`/v1/organizations/${alpha.organization.id}/memberships`)
          .set('authorization', alpha.authorization),
        request(app.getHttpServer())
          .patch(
            `/v1/organizations/${alpha.organization.id}/memberships/${alpha.userId}`,
          )
          .set('authorization', alpha.authorization)
          .send({ role: 'member' }),
        request(app.getHttpServer())
          .delete(
            `/v1/organizations/${alpha.organization.id}/memberships/${alpha.userId}`,
          )
          .set('authorization', alpha.authorization),
        request(app.getHttpServer())
          .get(`/v1/organizations/${alpha.organization.id}/invitations`)
          .set('authorization', alpha.authorization),
        request(app.getHttpServer())
          .post(`/v1/organizations/${alpha.organization.id}/invitations`)
          .set('authorization', alpha.authorization)
          .send({ emailAddress: 'lost-access@test.invalid', role: 'member' }),
        request(app.getHttpServer())
          .get(`/v1/organizations/by-slug/${alpha.organization.slug}`)
          .set('authorization', alpha.authorization),
      ]);
      expect(
        lostAccess.map(({ status: responseStatus }) => responseStatus),
      ).toEqual([403, 403, 403, 403, 403, 403, 403, 403, 403]);
    }
  });

  it('persists Membership lifecycle transitions and protects the last Owner', async () => {
    const ownerId = 'user_postgres_owner';
    const memberId = 'user_postgres_member';
    const creation = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', `Bearer ${createSessionToken({ userId: ownerId })}`)
      .set('idempotency-key', 'postgres-membership-lifecycle')
      .send({
        name: 'Postgres Memberships',
        slug: 'postgres-memberships',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      })
      .expect(201);
    const organization = creation.body.organization as {
      id: string;
      slug: string;
    };
    const ownerAuthorization = `Bearer ${createSessionToken({
      userId: ownerId,
      organization,
      organizationRole: 'owner',
    })}`;
    const memberPath = `/v1/organizations/${organization.id}/memberships/${memberId}`;

    await pool.query(
      `INSERT INTO memberships (id, organization_id, user_id, role, status, updated_at)
       VALUES ($1, $2, $3, 'MEMBER', 'ACTIVE', NOW())`,
      ['018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c2001', organization.id, memberId],
    );

    await request(app.getHttpServer())
      .patch(memberPath)
      .set('authorization', ownerAuthorization)
      .send({ role: 'admin' })
      .expect(200)
      .expect({ userId: memberId, role: 'admin', status: 'active' });
    await request(app.getHttpServer())
      .patch(memberPath)
      .set('authorization', ownerAuthorization)
      .send({ status: 'suspended' })
      .expect(200)
      .expect({ userId: memberId, role: 'admin', status: 'suspended' });

    const memberAuthorization = `Bearer ${createSessionToken({
      userId: memberId,
      organization,
      organizationRole: 'admin',
    })}`;
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/settings`)
      .set('authorization', memberAuthorization)
      .expect(403);

    await request(app.getHttpServer())
      .patch(memberPath)
      .set('authorization', ownerAuthorization)
      .send({ status: 'active' })
      .expect(200);
    await request(app.getHttpServer())
      .delete(memberPath)
      .set('authorization', ownerAuthorization)
      .expect(200)
      .expect({ userId: memberId, role: 'admin', status: 'removed' });
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/memberships`)
      .set('authorization', ownerAuthorization)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toContainEqual({
          userId: memberId,
          role: 'admin',
          status: 'removed',
        });
      });

    await request(app.getHttpServer())
      .patch(`/v1/organizations/${organization.id}/memberships/${ownerId}`)
      .set('authorization', ownerAuthorization)
      .send({ role: 'admin' })
      .expect(409);

    const otherCreation = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set(
        'authorization',
        `Bearer ${createSessionToken({ userId: 'user_postgres_other_owner' })}`,
      )
      .set('idempotency-key', 'postgres-other-memberships')
      .send({
        name: 'Other Postgres Memberships',
        slug: 'other-postgres-memberships',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      })
      .expect(201);
    const otherOrganizationId = otherCreation.body.organization.id as string;
    const otherMembershipsPath = `/v1/organizations/${otherOrganizationId}/memberships`;

    await request(app.getHttpServer())
      .get(otherMembershipsPath)
      .set('authorization', ownerAuthorization)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`${otherMembershipsPath}/user_postgres_other_owner`)
      .set('authorization', ownerAuthorization)
      .send({ role: 'member' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`${otherMembershipsPath}/user_postgres_other_owner`)
      .set('authorization', ownerAuthorization)
      .expect(403);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await pool.end();
  });
});
