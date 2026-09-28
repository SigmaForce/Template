import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApi } from '../src/configure-api.js';
import { MemoryApiKeyRepository } from '../src/api-keys/memory-api-keys.js';
import { MemoryAuditEventRepository } from '../src/audit-events/memory-audit-events.js';
import {
  MemoryBillingProjectionQueue,
  MemoryBillingRepository,
} from '../src/billing/memory-billing.js';
import { MemoryBillingCheckoutGateway } from '../src/billing/checkout.js';
import { MemoryBillingPortalGateway } from '../src/billing/portal.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from '../src/organizations/memory-organizations.js';
import { MemoryOrganizationOnboardingUnitOfWork } from '../src/application/organization-onboarding.js';
import {
  MemoryWebhookQueue,
  MemoryWebhookRepository,
} from '../src/webhooks/memory-webhooks.js';
import { WebhooksService } from '../src/webhooks/webhooks.service.js';
import {
  authenticationPublicKey,
  createSessionToken,
} from './session-token.js';

describe('Organization Webhooks (e2e)', () => {
  let app: INestApplication;
  afterEach(async () => app?.close());

  it('registers safe endpoints, emits idempotent deliveries, and audits replay', async () => {
    const organization = { id: 'org_webhooks_test', slug: 'webhooks-test' };
    const repository = new MemoryOrganizationRepository({
      organizations: [
        {
          ...organization,
          name: 'Webhooks',
          locale: 'en-US',
          timeZone: 'UTC',
          state: 'active',
        },
      ],
      memberships: [
        {
          organizationId: organization.id,
          role: 'owner',
          status: 'active',
          userId: 'user_webhooks_test',
        },
      ],
    });
    const auditEvents = new MemoryAuditEventRepository();
    const webhooks = new MemoryWebhookRepository();
    const queue = new MemoryWebhookQueue();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule.register({
          apiKeys: { repository: new MemoryApiKeyRepository() },
          auditEvents: { repository: auditEvents },
          authentication: {
            authorizedParties: ['http://localhost:3000'],
            jwtKey: authenticationPublicKey,
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
            stripeWebhookSecret: 'whsec_test',
          },
          organizations: {
            directory: new MemoryOrganizationDirectory(),
            onboarding: new MemoryOrganizationOnboardingUnitOfWork(
              (record) => repository.reserveOnboarding(record),
              (record) => repository.completeOnboarding(record),
              (record) => repository.releaseOnboardingReservation(record),
              auditEvents,
            ),
            repository,
          },
          webhooks: { repository: webhooks, queue },
        }),
      ],
    }).compile();
    app = moduleFixture.createNestApplication({ rawBody: true });
    configureApi(app);
    await app.init();
    const token = `Bearer ${createSessionToken({ organization, organizationRole: 'owner', userId: 'user_webhooks_test' })}`;
    await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/webhook-endpoints`)
      .set('authorization', token)
      .send({
        url: 'http://127.0.0.1/hook',
        events: ['organization.file.created'],
      })
      .expect(400);
    const created = await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/webhook-endpoints`)
      .set('authorization', token)
      .send({
        url: 'https://example.com/events',
        events: ['organization.file.created'],
      })
      .expect(201);
    expect(created.body.secret).toMatch(/^whsec_/);
    const endpointId = created.body.endpoint.id;
    const service = app.get(WebhooksService);
    const first = await service.emit({
      endpointId,
      eventId: 'evt_file_1',
      eventType: 'organization.file.created',
      payload: { fileId: 'file_1' },
    });
    const duplicate = await service.emit({
      endpointId,
      eventId: 'evt_file_1',
      eventType: 'organization.file.created',
      payload: { fileId: 'file_1' },
    });
    expect(first?.id).toBe('evt_file_1');
    expect(duplicate).toBeNull();
    expect(queue.jobs).toEqual([first!.id]);
    await request(app.getHttpServer())
      .patch(
        `/v1/organizations/${organization.id}/webhook-endpoints/${endpointId}`,
      )
      .set('authorization', token)
      .send({ enabled: false })
      .expect(200);
    expect(
      await service.emit({
        endpointId,
        eventType: 'organization.file.created',
        payload: {},
      }),
    ).toBeNull();
    await request(app.getHttpServer())
      .post(
        `/v1/organizations/${organization.id}/webhook-endpoints/${endpointId}/deliveries/${first!.id}/replay`,
      )
      .set('authorization', token)
      .expect(400);
    await request(app.getHttpServer())
      .patch(
        `/v1/organizations/${organization.id}/webhook-endpoints/${endpointId}`,
      )
      .set('authorization', token)
      .send({ enabled: true })
      .expect(200);
    await request(app.getHttpServer())
      .post(
        `/v1/organizations/${organization.id}/webhook-endpoints/${endpointId}/deliveries/${first!.id}/replay`,
      )
      .set('authorization', token)
      .expect(201);
    expect(
      (
        await auditEvents.list({ limit: 10, organizationId: organization.id })
      ).map(({ action }) => action),
    ).toEqual([
      'organization.webhook-delivery.replay-requested',
      'organization.webhook-endpoint.update-requested',
      'organization.webhook-endpoint.update-requested',
      'organization.webhook-endpoint.create-requested',
    ]);
  });
});
