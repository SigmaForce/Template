import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApi } from './../src/configure-api.js';
import type { ReadinessCheck } from '@saas/tooling-config/readiness';
import { JsonLogger } from '@saas/tooling-config/logging';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
  type MemoryOrganizationRepositorySeed,
} from './../src/organizations/memory-organizations.js';
import {
  authenticationPublicKey,
  createSessionToken,
} from './session-token.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  async function createApp(
    readinessChecks: ReadinessCheck[] = [],
    logger?: JsonLogger,
    repository = new MemoryOrganizationRepository(),
    directory = new MemoryOrganizationDirectory(),
  ) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule.register({
          authentication: {
            authorizedParties: ['http://localhost:3000'],
            jwtKey: authenticationPublicKey,
          },
          organizations: {
            directory,
            repository,
          },
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

  it('derives the Active Organization only from the verified token', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/organizations/active?organizationId=org_from_query')
      .set(
        'authorization',
        `Bearer ${createSessionToken({
          organization: { id: 'org_verified', slug: 'verified-org' },
        })}`,
      )
      .set('x-organization-id', 'org_from_header')
      .send({ organizationId: 'org_from_body' })
      .expect(200);

    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toEqual({
      id: 'org_verified',
      slug: 'verified-org',
      permissions: [],
    });
  });

  it('rejects an Organization-owned request without an Active Organization', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/organizations/active')
      .set('authorization', `Bearer ${createSessionToken()}`)
      .expect('content-type', /application\/problem\+json/)
      .expect(409);

    expect(response.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:active-organization-required',
      title: 'Active Organization required',
      status: 409,
      detail: 'Select an Active Organization and retry the request.',
    });
  });

  it('keeps concurrent Active Organization contexts request-scoped', async () => {
    const server = app.getHttpServer();
    const [alpha, beta] = await Promise.all([
      request(server)
        .get('/v1/organizations/active')
        .set(
          'authorization',
          `Bearer ${createSessionToken({
            organization: { id: 'org_alpha', slug: 'alpha' },
          })}`,
        )
        .expect(200),
      request(server)
        .get('/v1/organizations/active')
        .set(
          'authorization',
          `Bearer ${createSessionToken({
            organization: { id: 'org_beta', slug: 'beta' },
          })}`,
        )
        .expect(200),
    ]);

    expect(alpha.body).toMatchObject({ id: 'org_alpha', slug: 'alpha' });
    expect(beta.body).toMatchObject({ id: 'org_beta', slug: 'beta' });
  });

  describe('central Organization permission pipeline', () => {
    const organization = {
      id: 'org_northstar',
      name: 'Northstar Labs',
      slug: 'northstar',
      locale: 'pt-BR',
      timeZone: 'America/Cuiaba',
      state: 'active' as const,
    };

    async function useAuthorizationFixture(
      memberships: NonNullable<MemoryOrganizationRepositorySeed['memberships']>,
      state: NonNullable<
        MemoryOrganizationRepositorySeed['organizations']
      >[number]['state'] = 'active',
    ) {
      await app.close();
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [{ ...organization, state }],
          memberships,
        }),
      );
    }

    function tokenFor(
      userId: string,
      role: 'admin' | 'member' | 'owner',
      activeOrganization = { id: organization.id, slug: organization.slug },
    ) {
      return `Bearer ${createSessionToken({
        userId,
        organization: activeOrganization,
        organizationRole: role,
      })}`;
    }

    it.each([
      ['owner', 'user_owner'],
      ['admin', 'user_admin'],
    ] as const)('grants the settings update to %s', async (role, userId) => {
      await useAuthorizationFixture([
        {
          organizationId: organization.id,
          userId,
          status: 'active',
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/v1/organizations/${organization.id}/settings`)
        .set('authorization', tokenFor(userId, role))
        .send({ locale: 'en-US', timeZone: 'UTC' })
        .expect(200);

      expect(response.body).toEqual({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        locale: 'en-US',
        timeZone: 'UTC',
      });

      await request(app.getHttpServer())
        .get(`/v1/organizations/${organization.id}/settings`)
        .set('authorization', tokenFor(userId, role))
        .expect(200)
        .expect(response.body);
    });

    it('denies a Member consistently and keeps Owner-only permissions out of its projection', async () => {
      await useAuthorizationFixture([
        {
          organizationId: organization.id,
          userId: 'user_member',
          status: 'active',
        },
      ]);
      const authorization = tokenFor('user_member', 'member');

      const active = await request(app.getHttpServer())
        .get('/v1/organizations/active')
        .set('authorization', authorization)
        .expect(200);
      expect(active.body.permissions).toEqual(['organization:settings:read']);

      const response = await request(app.getHttpServer())
        .patch(`/v1/organizations/${organization.id}/settings`)
        .set('authorization', authorization)
        .send({ locale: 'en-US', timeZone: 'UTC' })
        .expect('content-type', /application\/problem\+json/)
        .expect(403);

      expect(response.body).toMatchObject({
        type: 'urn:problem:next-nest-saas-starter:permission-denied',
        title: 'Permission denied',
        status: 403,
        detail: 'You do not have permission to perform this action.',
      });
    });

    it('denies a suspended Membership with the same public response', async () => {
      await useAuthorizationFixture([
        {
          organizationId: organization.id,
          userId: 'user_suspended',
          status: 'suspended',
        },
      ]);

      const projection = await request(app.getHttpServer())
        .get('/v1/organizations/active')
        .set('authorization', tokenFor('user_suspended', 'owner'))
        .expect(200);
      expect(projection.body.permissions).toEqual([]);

      const response = await request(app.getHttpServer())
        .patch(`/v1/organizations/${organization.id}/settings`)
        .set('authorization', tokenFor('user_suspended', 'owner'))
        .send({ locale: 'en-US', timeZone: 'UTC' })
        .expect(403);

      expect(response.body).toMatchObject({
        type: 'urn:problem:next-nest-saas-starter:permission-denied',
        status: 403,
      });
    });

    it('denies a resource outside the Active Organization context', async () => {
      await useAuthorizationFixture([
        {
          organizationId: organization.id,
          userId: 'user_owner',
          status: 'active',
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch('/v1/organizations/org_other/settings')
        .set('authorization', tokenFor('user_owner', 'owner'))
        .send({ locale: 'en-US', timeZone: 'UTC' })
        .expect(403);

      expect(response.body).toMatchObject({
        type: 'urn:problem:next-nest-saas-starter:permission-denied',
        status: 403,
      });
    });

    it('preserves safe read-only actions while denying settings writes', async () => {
      await useAuthorizationFixture(
        [
          {
            organizationId: organization.id,
            userId: 'user_read_only_owner',
            status: 'active',
          },
        ],
        'read-only',
      );
      const authorization = tokenFor('user_read_only_owner', 'owner');

      const active = await request(app.getHttpServer())
        .get('/v1/organizations/active')
        .set('authorization', authorization)
        .expect(200);
      expect(active.body.permissions).toEqual([
        'organization:settings:read',
        'organization:memberships:manage',
        'billing:manage',
        'organization:ownership:manage',
      ]);

      await request(app.getHttpServer())
        .get(`/v1/organizations/${organization.id}/settings`)
        .set('authorization', authorization)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/v1/organizations/${organization.id}/settings`)
        .set('authorization', authorization)
        .send({ locale: 'en-US', timeZone: 'UTC' })
        .expect(403);
    });

    it('keeps billing, ownership and deletion exclusive to Owner', async () => {
      await useAuthorizationFixture([
        {
          organizationId: organization.id,
          userId: 'user_admin',
          status: 'active',
        },
        {
          organizationId: organization.id,
          userId: 'user_owner',
          status: 'active',
        },
      ]);
      const admin = await request(app.getHttpServer())
        .get('/v1/organizations/active')
        .set('authorization', tokenFor('user_admin', 'admin'))
        .expect(200);
      const owner = await request(app.getHttpServer())
        .get('/v1/organizations/active')
        .set('authorization', tokenFor('user_owner', 'owner'))
        .expect(200);

      expect(admin.body.permissions).toEqual([
        'organization:settings:read',
        'organization:settings:update',
        'organization:memberships:manage',
      ]);
      expect(admin.body.permissions).not.toEqual(
        expect.arrayContaining([
          'billing:manage',
          'organization:ownership:manage',
          'organization:delete',
        ]),
      );
      expect(owner.body.permissions).toEqual(
        expect.arrayContaining([
          'billing:manage',
          'organization:ownership:manage',
          'organization:delete',
        ]),
      );
    });
  });

  describe('Organization Invitations', () => {
    const organization = {
      id: 'org_invitations',
      name: 'Invitation Labs',
      slug: 'invitation-labs',
      locale: 'pt-BR',
      timeZone: 'America/Cuiaba',
      state: 'active' as const,
    };

    it('lets an Owner create a pending Invitation', async () => {
      await app.close();
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [organization],
          memberships: [
            {
              organizationId: organization.id,
              userId: 'user_owner',
              status: 'active',
            },
          ],
        }),
      );

      const response = await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set(
          'authorization',
          `Bearer ${createSessionToken({
            userId: 'user_owner',
            organization,
            organizationRole: 'owner',
          })}`,
        )
        .send({ emailAddress: ' New.User@Example.com ', role: 'member' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        organizationId: organization.id,
        emailAddress: 'new.user@example.com',
        role: 'member',
        status: 'pending',
        expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });

    async function useInvitationActor(
      role: 'admin' | 'member' | 'owner',
      userId = `user_${role}`,
    ) {
      await app.close();
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [organization],
          memberships: [
            {
              organizationId: organization.id,
              userId,
              status: 'active',
            },
          ],
        }),
      );
      return `Bearer ${createSessionToken({
        userId,
        organization,
        organizationRole: role,
      })}`;
    }

    it('applies the invitation Role matrix', async () => {
      let authorization = await useInvitationActor('admin');
      await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization)
        .send({ emailAddress: 'member@example.com', role: 'member' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization)
        .send({ emailAddress: 'owner@example.com', role: 'owner' })
        .expect(403);

      authorization = await useInvitationActor('member');
      await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization)
        .send({ emailAddress: 'other@example.com', role: 'member' })
        .expect(403);
    });

    it('does not let an Admin resend an Owner Invitation', async () => {
      await app.close();
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [organization],
          memberships: ['user_owner', 'user_admin'].map((userId) => ({
            organizationId: organization.id,
            userId,
            status: 'active' as const,
          })),
        }),
      );
      const authorization = (userId: string, role: 'admin' | 'owner') =>
        `Bearer ${createSessionToken({
          userId,
          organization,
          organizationRole: role,
        })}`;

      const invitation = await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization('user_owner', 'owner'))
        .send({ emailAddress: 'next-owner@example.com', role: 'owner' })
        .expect(201);
      await request(app.getHttpServer())
        .delete(
          `/v1/organizations/${organization.id}/invitations/${invitation.body.id as string}`,
        )
        .set('authorization', authorization('user_owner', 'owner'))
        .expect(200);
      await request(app.getHttpServer())
        .post(
          `/v1/organizations/${organization.id}/invitations/${invitation.body.id as string}/resend`,
        )
        .set('authorization', authorization('user_admin', 'admin'))
        .expect(403);
    });

    it('reuses, revokes and resends one Invitation intention', async () => {
      const authorization = await useInvitationActor('owner');
      const create = () =>
        request(app.getHttpServer())
          .post(`/v1/organizations/${organization.id}/invitations`)
          .set('authorization', authorization)
          .send({ emailAddress: 'repeat@example.com', role: 'member' });

      const first = await create().expect(201);
      const duplicate = await create().expect(201);
      expect(duplicate.body.id).toBe(first.body.id);

      const list = await request(app.getHttpServer())
        .get(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization)
        .expect(200);
      expect(list.body).toEqual({ items: [first.body] });

      const revoked = await request(app.getHttpServer())
        .delete(
          `/v1/organizations/${organization.id}/invitations/${first.body.id as string}`,
        )
        .set('authorization', authorization)
        .expect(200);
      expect(revoked.body).toMatchObject({
        id: first.body.id,
        status: 'revoked',
      });

      await create().expect(409);

      const resent = await request(app.getHttpServer())
        .post(
          `/v1/organizations/${organization.id}/invitations/${first.body.id as string}/resend`,
        )
        .set('authorization', authorization)
        .expect(200);
      expect(resent.body).toMatchObject({
        id: first.body.id,
        status: 'pending',
      });

      const after = await request(app.getHttpServer())
        .get(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization)
        .expect(200);
      expect(after.body.items).toHaveLength(1);
    });

    it('keeps one active Invitation across concurrent resends', async () => {
      await app.close();
      const directory = new MemoryOrganizationDirectory();
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [organization],
          memberships: [
            {
              organizationId: organization.id,
              userId: 'user_owner',
              status: 'active',
            },
          ],
        }),
        directory,
      );
      const authorization = `Bearer ${createSessionToken({
        userId: 'user_owner',
        organization,
        organizationRole: 'owner',
      })}`;
      const created = await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization)
        .send({ emailAddress: 'concurrent@example.com', role: 'member' })
        .expect(201);
      const resend = () =>
        request(app.getHttpServer())
          .post(
            `/v1/organizations/${organization.id}/invitations/${created.body.id as string}/resend`,
          )
          .set('authorization', authorization);

      const responses = await Promise.all([resend(), resend()]);
      expect(responses.map(({ status }) => status)).toEqual(
        expect.arrayContaining([200]),
      );
      expect(responses.every(({ status }) => [200, 409].includes(status))).toBe(
        true,
      );
      expect(directory.activeInvitationCountFor('concurrent@example.com')).toBe(
        1,
      );
    });

    it('does not resend an Invitation accepted during the request', async () => {
      class AcceptanceRaceRepository extends MemoryOrganizationRepository {
        override async claimInvitationForResend(
          input: Parameters<
            MemoryOrganizationRepository['claimInvitationForResend']
          >[0],
        ) {
          const invitation = await this.findInvitation({
            id: input.invitationId,
            organizationId: input.organizationId,
          });
          if (invitation) {
            await this.acceptInvitation({
              invitationId: invitation.id,
              organizationId: invitation.organizationId,
              role: invitation.role,
              userId: 'user_invited',
            });
          }
          return super.claimInvitationForResend(input);
        }
      }

      await app.close();
      app = await createApp(
        [],
        undefined,
        new AcceptanceRaceRepository({
          organizations: [organization],
          memberships: [
            {
              organizationId: organization.id,
              userId: 'user_owner',
              status: 'active',
            },
          ],
        }),
      );
      const authorization = `Bearer ${createSessionToken({
        userId: 'user_owner',
        organization,
        organizationRole: 'owner',
      })}`;
      const created = await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', authorization)
        .send({ emailAddress: 'race@example.com', role: 'member' })
        .expect(201);

      await request(app.getHttpServer())
        .post(
          `/v1/organizations/${organization.id}/invitations/${created.body.id as string}/resend`,
        )
        .set('authorization', authorization)
        .expect(409);
    });

    it('accepts a valid Invitation once and creates the expected Membership', async () => {
      await app.close();
      const directory = new MemoryOrganizationDirectory();
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [organization],
          memberships: [
            {
              organizationId: organization.id,
              userId: 'user_owner',
              status: 'active',
            },
          ],
        }),
        directory,
      );
      const ownerAuthorization = `Bearer ${createSessionToken({
        userId: 'user_owner',
        organization,
        organizationRole: 'owner',
      })}`;
      await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', ownerAuthorization)
        .send({ emailAddress: 'invited@example.com', role: 'member' })
        .expect(201);

      const externalId = directory.acceptInvitation({
        emailAddress: 'invited@example.com',
        userId: 'user_invited',
      });
      const invitedAuthorization = `Bearer ${createSessionToken({
        userId: 'user_invited',
      })}`;
      const accepted = await request(app.getHttpServer())
        .post(`/v1/invitations/${externalId}/accept`)
        .set('authorization', invitedAuthorization)
        .expect(200);
      expect(accepted.body).toEqual({
        organization: { id: organization.id, slug: organization.slug },
        membership: { role: 'member' },
      });

      const activeAuthorization = `Bearer ${createSessionToken({
        userId: 'user_invited',
        organization,
        organizationRole: 'member',
      })}`;
      const active = await request(app.getHttpServer())
        .get('/v1/organizations/active')
        .set('authorization', activeAuthorization)
        .expect(200);
      expect(active.body.permissions).toEqual(['organization:settings:read']);

      await request(app.getHttpServer())
        .post(`/v1/invitations/${externalId}/accept`)
        .set('authorization', invitedAuthorization)
        .expect(409);
      const recovered = await request(app.getHttpServer())
        .get(`/v1/invitations/${externalId}/acceptance`)
        .set('authorization', invitedAuthorization)
        .expect(200);
      expect(recovered.body).toEqual(accepted.body);
      await request(app.getHttpServer())
        .get(`/v1/invitations/${externalId}/acceptance`)
        .set(
          'authorization',
          `Bearer ${createSessionToken({ userId: 'user_other' })}`,
        )
        .expect(409);
    });

    it('rejects an Invitation for another identity or an invalid state', async () => {
      await app.close();
      let directory = new MemoryOrganizationDirectory();
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [organization],
          memberships: [
            {
              organizationId: organization.id,
              userId: 'user_owner',
              status: 'active',
            },
          ],
        }),
        directory,
      );
      const ownerAuthorization = `Bearer ${createSessionToken({
        userId: 'user_owner',
        organization,
        organizationRole: 'owner',
      })}`;
      await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', ownerAuthorization)
        .send({ emailAddress: 'intended@example.com', role: 'member' })
        .expect(201);
      const intendedId = directory.acceptInvitation({
        emailAddress: 'intended@example.com',
        userId: 'user_intended',
      });
      await request(app.getHttpServer())
        .post(`/v1/invitations/${intendedId}/accept`)
        .set(
          'authorization',
          `Bearer ${createSessionToken({ userId: 'user_other' })}`,
        )
        .expect(409);

      const revocable = await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', ownerAuthorization)
        .send({ emailAddress: 'revoked@example.com', role: 'member' })
        .expect(201);
      const revokedExternalId = directory.invitationIdFor(
        'revoked@example.com',
      );
      await request(app.getHttpServer())
        .delete(
          `/v1/organizations/${organization.id}/invitations/${revocable.body.id as string}`,
        )
        .set('authorization', ownerAuthorization)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/v1/invitations/${revokedExternalId}/accept`)
        .set(
          'authorization',
          `Bearer ${createSessionToken({ userId: 'user_intended' })}`,
        )
        .expect(409);

      await app.close();
      directory = new MemoryOrganizationDirectory({ invitationLifetimeMs: -1 });
      app = await createApp(
        [],
        undefined,
        new MemoryOrganizationRepository({
          organizations: [organization],
          memberships: [
            {
              organizationId: organization.id,
              userId: 'user_owner',
              status: 'active',
            },
          ],
        }),
        directory,
      );
      await request(app.getHttpServer())
        .post(`/v1/organizations/${organization.id}/invitations`)
        .set('authorization', ownerAuthorization)
        .send({ emailAddress: 'expired@example.com', role: 'member' })
        .expect(201);
      const expiredId = directory.invitationIdFor('expired@example.com');

      await request(app.getHttpServer())
        .post(`/v1/invitations/${expiredId}/accept`)
        .set(
          'authorization',
          `Bearer ${createSessionToken({ userId: 'user_other' })}`,
        )
        .expect(409);
    });
  });

  it('creates the first Organization with exactly one Owner Membership', async () => {
    const authorization = `Bearer ${createSessionToken()}`;
    const creation = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', 'onboarding-first-organization')
      .send({
        name: 'Northstar Labs',
        slug: 'northstar-labs',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      })
      .expect(201);

    expect(creation.body).toEqual({
      organization: {
        id: 'org_northstar_labs',
        name: 'Northstar Labs',
        slug: 'northstar-labs',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      },
      membership: { role: 'owner' },
    });

    const onboarding = await request(app.getHttpServer())
      .get('/v1/organizations/onboarding')
      .set('authorization', authorization)
      .expect(200);

    expect(onboarding.body).toEqual({
      status: 'complete',
      ...creation.body,
    });
  });

  it('rejects an invalid Organization slug without leaving partial state', async () => {
    const authorization = `Bearer ${createSessionToken()}`;
    const response = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', 'onboarding-invalid-slug')
      .send({
        name: 'Northstar Labs',
        slug: 'Northstar Labs!',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      })
      .expect('content-type', /application\/problem\+json/)
      .expect(400);

    expect(response.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:validation',
      errors: expect.arrayContaining([
        {
          pointer: '#/body/slug',
          detail: expect.any(String),
        },
      ]),
    });

    await request(app.getHttpServer())
      .get('/v1/organizations/onboarding')
      .set('authorization', authorization)
      .expect(200)
      .expect({ status: 'required' });
  });

  it('rejects a reserved Organization slug', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', `Bearer ${createSessionToken()}`)
      .set('idempotency-key', 'onboarding-reserved-slug')
      .send({
        name: 'Reserved Organization',
        slug: 'api',
        locale: 'en-US',
        timeZone: 'UTC',
      })
      .expect('content-type', /application\/problem\+json/)
      .expect(400);

    expect(response.body.errors).toContainEqual({
      pointer: '#/body/slug',
      detail: 'slug is reserved',
    });
  });

  it('requires a safe idempotency key for Organization creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', `Bearer ${createSessionToken()}`)
      .send({
        name: 'Northstar Labs',
        slug: 'northstar-labs',
        locale: 'pt-BR',
        timeZone: 'America/Cuiaba',
      })
      .expect('content-type', /application\/problem\+json/)
      .expect(400);

    expect(response.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:validation',
      errors: [
        {
          pointer: '#/headers/idempotency-key',
          detail:
            'Idempotency-Key must contain 8 to 128 safe ASCII characters.',
        },
      ],
    });
  });

  it('rejects an Organization slug that is already in use without partial state', async () => {
    const input = {
      name: 'Northstar Labs',
      slug: 'shared-slug',
      locale: 'pt-BR',
      timeZone: 'America/Cuiaba',
    };
    const firstUser = `Bearer ${createSessionToken({ userId: 'user_first' })}`;
    const secondUser = `Bearer ${createSessionToken({ userId: 'user_second' })}`;

    await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', firstUser)
      .set('idempotency-key', 'first-user-organization')
      .send(input)
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', secondUser)
      .set('idempotency-key', 'second-user-organization')
      .send(input)
      .expect('content-type', /application\/problem\+json/)
      .expect(409);

    expect(conflict.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:organization-slug-conflict',
      title: 'Organization slug is unavailable',
      status: 409,
      errors: [
        {
          pointer: '#/body/slug',
          detail: 'Choose a different Organization slug.',
        },
      ],
    });

    await request(app.getHttpServer())
      .get('/v1/organizations/onboarding')
      .set('authorization', secondUser)
      .expect(200)
      .expect({ status: 'required' });
  });

  it('replays an accidental repeated onboarding submission without duplicates', async () => {
    const authorization = `Bearer ${createSessionToken()}`;
    const input = {
      name: 'Idempotent Labs',
      slug: 'idempotent-labs',
      locale: 'en-US',
      timeZone: 'UTC',
    };

    const first = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', 'same-onboarding-submission')
      .send(input)
      .expect(201);

    const repeated = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', 'same-onboarding-submission')
      .send(input)
      .expect(201);

    expect(repeated.body).toEqual(first.body);
    await request(app.getHttpServer())
      .get('/v1/organizations/onboarding')
      .set('authorization', authorization)
      .expect(200)
      .expect({ status: 'complete', ...first.body });
  });

  it('rejects reuse of an idempotency key with different input', async () => {
    const authorization = `Bearer ${createSessionToken()}`;
    const idempotencyKey = 'same-key-different-input';
    const original = {
      name: 'Original Labs',
      slug: 'original-labs',
      locale: 'en-US',
      timeZone: 'UTC',
    };

    const creation = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', idempotencyKey)
      .send(original)
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set('authorization', authorization)
      .set('idempotency-key', idempotencyKey)
      .send({ ...original, name: 'Changed Labs' })
      .expect('content-type', /application\/problem\+json/)
      .expect(409);

    expect(conflict.body).toMatchObject({
      type: 'urn:problem:next-nest-saas-starter:idempotency-conflict',
      title: 'Idempotency key conflict',
    });
    await request(app.getHttpServer())
      .get('/v1/organizations/onboarding')
      .set('authorization', authorization)
      .expect(200)
      .expect({ status: 'complete', ...creation.body });
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
