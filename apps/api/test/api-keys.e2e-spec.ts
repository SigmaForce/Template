import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { MemoryOrganizationOnboardingUnitOfWork } from '../src/application/organization-onboarding.js';
import { MemoryApiKeyRepository } from '../src/api-keys/memory-api-keys.js';
import { MemoryAuditEventRepository } from '../src/audit-events/memory-audit-events.js';
import type { AuthenticationOptions } from '../src/authentication/authentication.js';
import { MemoryBillingCheckoutGateway } from '../src/billing/checkout.js';
import {
  MemoryBillingProjectionQueue,
  MemoryBillingRepository,
} from '../src/billing/memory-billing.js';
import { MemoryBillingPortalGateway } from '../src/billing/portal.js';
import { configureApi } from '../src/configure-api.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from '../src/organizations/memory-organizations.js';
import {
  authenticationPublicKey,
  createSessionToken,
} from './session-token.js';

const organization = {
  id: 'org_api_keys',
  name: 'API Key Labs',
  slug: 'api-key-labs',
  locale: 'en-US',
  timeZone: 'UTC',
  state: 'active' as const,
};
const owner = `Bearer ${createSessionToken({
  organization,
  organizationRole: 'owner',
  userId: 'user_api_key_owner',
})}`;

describe('API Keys (e2e)', () => {
  let app: INestApplication;

  async function createApp(input?: {
    auditEvents?: MemoryAuditEventRepository;
    apiKeys?: MemoryApiKeyRepository;
    organizations?: (typeof organization)[];
    rateLimit?: AuthenticationOptions['rateLimit'];
  }) {
    const repository = new MemoryOrganizationRepository({
      organizations: input?.organizations ?? [organization],
      memberships: [
        {
          organizationId: organization.id,
          role: 'owner',
          status: 'active',
          userId: 'user_api_key_owner',
        },
      ],
    });
    const module = await Test.createTestingModule({
      imports: [
        AppModule.register({
          apiKeys: {
            repository: input?.apiKeys ?? new MemoryApiKeyRepository(),
          },
          auditEvents: {
            repository: input?.auditEvents ?? new MemoryAuditEventRepository(),
          },
          authentication: {
            authorizedParties: ['http://localhost:3000'],
            jwtKey: authenticationPublicKey,
            ...(input?.rateLimit ? { rateLimit: input.rateLimit } : {}),
          },
          billing: {
            checkoutGateway: new MemoryBillingCheckoutGateway(),
            checkoutReturnOrigins: ['http://localhost:3000'],
            planMappings: {
              launch: {
                priceId: 'price_launchTest',
                productId: 'prod_launchTest',
              },
              scale: {
                priceId: 'price_scaleTest',
                productId: 'prod_scaleTest',
              },
            },
            portalGateway: new MemoryBillingPortalGateway(),
            projectionQueue: new MemoryBillingProjectionQueue(),
            repository: new MemoryBillingRepository(),
            stripeWebhookSecret: 'whsec_testWebhookSecret',
          },
          organizations: {
            directory: new MemoryOrganizationDirectory(),
            onboarding: new MemoryOrganizationOnboardingUnitOfWork(
              (record) => repository.reserveOnboarding(record),
              (record) => repository.completeOnboarding(record),
              (record) => repository.releaseOnboardingReservation(record),
              input?.auditEvents ?? new MemoryAuditEventRepository(),
            ),
            repository,
          },
        }),
      ],
    }).compile();
    const testApp = module.createNestApplication({ rawBody: true });
    configureApi(testApp);
    await testApp.init();
    return testApp;
  }

  afterEach(async () => {
    vi.useRealTimers();
    await app?.close();
  });

  it('returns new plaintext once and stores only its verifier', async () => {
    const apiKeys = new MemoryApiKeyRepository();
    const auditEvents = new MemoryAuditEventRepository();
    app = await createApp({ apiKeys, auditEvents });

    const response = await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/api-keys`)
      .set('authorization', owner)
      .send({
        name: 'Reporting',
        scopes: ['organization:audit-events:read'],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      apiKey: {
        name: 'Reporting',
        organizationId: organization.id,
        scopes: ['organization:audit-events:read'],
      },
      plaintext: expect.stringMatching(/^sak_[0-9a-f-]{36}\.[\w-]+$/),
    });
    const stored = [...apiKeys.apiKeys.values()][0];
    expect(stored).not.toHaveProperty('plaintext');
    expect(JSON.stringify(stored)).not.toContain(response.body.plaintext);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 1_000));
    const later = await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/api-keys`)
      .set('authorization', owner)
      .send({
        name: 'Later reporting',
        scopes: ['organization:audit-events:read'],
      })
      .expect(201);
    vi.useRealTimers();
    const list = await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/api-keys`)
      .query({ limit: 1 })
      .set('authorization', owner)
      .expect(200);
    expect(list.body).toMatchObject({
      items: [later.body.apiKey],
      pageInfo: { hasNextPage: true },
    });
    const nextPage = await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/api-keys`)
      .query({ cursor: list.body.pageInfo.nextCursor, limit: 1 })
      .set('authorization', owner)
      .expect(200);
    expect(nextPage.body).toEqual({
      items: [response.body.apiKey],
      pageInfo: { hasNextPage: false, nextCursor: null },
    });
    expect(JSON.stringify(list.body)).not.toContain(response.body.plaintext);
    expect(JSON.stringify(list.body)).not.toContain(later.body.plaintext);
    expect(
      JSON.stringify(
        await auditEvents.list({
          limit: 10,
          organizationId: organization.id,
        }),
      ),
    ).not.toContain(response.body.plaintext);
  });

  it('derives Organization and scopes from the verified API Key', async () => {
    const otherOrganization = {
      ...organization,
      id: 'org_other_api_keys',
      slug: 'other-api-key-labs',
    };
    app = await createApp({
      organizations: [organization, otherOrganization],
    });
    const issue = async (scopes: string[]) =>
      (
        await request(app.getHttpServer())
          .post(`/v1/organizations/${organization.id}/api-keys`)
          .set('authorization', owner)
          .send({ name: 'Machine', scopes })
          .expect(201)
      ).body.plaintext as string;
    const auditReader = await issue(['organization:audit-events:read']);
    const settingsReader = await issue(['organization:settings:read']);

    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/audit-events`)
      .set('authorization', `Bearer ${auditReader}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/audit-events`)
      .set('authorization', `Bearer ${settingsReader}`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/settings`)
      .set('authorization', `Bearer ${settingsReader}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/v1/organizations/${otherOrganization.id}/audit-events`)
      .set('authorization', `Bearer ${auditReader}`)
      .expect(403);
  });

  it('overlaps rotation and rejects revocation immediately', async () => {
    const auditEvents = new MemoryAuditEventRepository();
    app = await createApp({ auditEvents });
    const issued = await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/api-keys`)
      .set('authorization', owner)
      .send({
        name: 'Rotating',
        scopes: ['organization:audit-events:read'],
      })
      .expect(201);

    const rotated = await request(app.getHttpServer())
      .post(
        `/v1/organizations/${organization.id}/api-keys/${issued.body.apiKey.id}/rotate`,
      )
      .set('authorization', owner)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/audit-events`)
      .set('authorization', `Bearer ${issued.body.plaintext}`)
      .expect(200);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 5 * 60_000));
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/audit-events`)
      .set('authorization', `Bearer ${issued.body.plaintext}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/audit-events`)
      .set('authorization', `Bearer ${rotated.body.plaintext}`)
      .expect(200);
    vi.useRealTimers();

    await request(app.getHttpServer())
      .delete(
        `/v1/organizations/${organization.id}/api-keys/${rotated.body.apiKey.id}`,
      )
      .set('authorization', owner)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/audit-events`)
      .set('authorization', `Bearer ${rotated.body.plaintext}`)
      .expect(401);
    expect(
      (
        await auditEvents.list({ limit: 10, organizationId: organization.id })
      ).map(({ action }) => action),
    ).toEqual([
      'organization.api-key.revoke-requested',
      'organization.api-key.rotate-requested',
      'organization.api-key.create-requested',
    ]);
  });

  it('allows security revocation while the Organization is read-only', async () => {
    const apiKeys = new MemoryApiKeyRepository();
    app = await createApp({ apiKeys });
    const issued = await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/api-keys`)
      .set('authorization', owner)
      .send({
        name: 'Emergency revoke',
        scopes: ['organization:audit-events:read'],
      })
      .expect(201);

    await app.close();
    app = await createApp({
      apiKeys,
      organizations: [{ ...organization, state: 'read-only' }],
    });
    await request(app.getHttpServer())
      .delete(
        `/v1/organizations/${organization.id}/api-keys/${issued.body.apiKey.id}`,
      )
      .set('authorization', owner)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/v1/organizations/${organization.id}/audit-events`)
      .set('authorization', `Bearer ${issued.body.plaintext}`)
      .expect(401);
  });

  it('rate limits each verified API Key', async () => {
    app = await createApp({
      rateLimit: {
        anonymous: 100,
        organization: 100,
        user: 1,
        windowMs: 60_000,
      },
    });
    const issued = await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/api-keys`)
      .set('authorization', owner)
      .send({
        name: 'Limited',
        scopes: ['organization:audit-events:read'],
      })
      .expect(201);
    const listAuditEvents = () =>
      request(app.getHttpServer())
        .get(`/v1/organizations/${organization.id}/audit-events`)
        .set('authorization', `Bearer ${issued.body.plaintext}`);

    await listAuditEvents().expect(200);
    await listAuditEvents().expect(429);
  });
});
