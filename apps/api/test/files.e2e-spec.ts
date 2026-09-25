import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApi } from '../src/configure-api.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from '../src/organizations/memory-organizations.js';
import {
  MemoryBillingProjectionQueue,
  MemoryBillingRepository,
} from '../src/billing/memory-billing.js';
import { MemoryBillingCheckoutGateway } from '../src/billing/checkout.js';
import { MemoryBillingPortalGateway } from '../src/billing/portal.js';
import { MemoryAuditEventRepository } from '../src/audit-events/memory-audit-events.js';
import {
  MemoryFileRepository,
  MemoryFileStorage,
} from '../src/files/memory-files.js';
import { MemoryOrganizationOnboardingUnitOfWork } from '../src/application/organization-onboarding.js';
import {
  authenticationPublicKey,
  createSessionToken,
} from './session-token.js';
import { MemoryApiKeyRepository } from '../src/api-keys/memory-api-keys.js';

describe('Organization Files (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => app?.close());

  it('validates, isolates, downloads, deletes, and audits a File lifecycle', async () => {
    const organization = { id: 'org_files_test', slug: 'files-test' };
    const otherOrganization = {
      id: 'org_other_files_test',
      slug: 'other-files-test',
    };
    const repository = new MemoryOrganizationRepository({
      organizations: [
        {
          ...organization,
          name: 'Files Test',
          locale: 'en-US',
          timeZone: 'UTC',
          state: 'active',
        },
        {
          ...otherOrganization,
          name: 'Other Files Test',
          locale: 'en-US',
          timeZone: 'UTC',
          state: 'active',
        },
      ],
      memberships: [organization, otherOrganization].map(({ id }) => ({
        organizationId: id,
        role: 'owner' as const,
        status: 'active' as const,
        userId: 'user_files_test',
      })),
    });
    const files = new MemoryFileRepository();
    const storage = new MemoryFileStorage();
    const auditEvents = new MemoryAuditEventRepository();
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
            stripeWebhookSecret: 'whsec_testWebhookSecret',
          },
          files: { repository: files, storage },
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
        }),
      ],
    }).compile();
    app = moduleFixture.createNestApplication({ rawBody: true });
    configureApi(app);
    await app.init();

    const token = (activeOrganization: typeof organization) =>
      `Bearer ${createSessionToken({
        organization: activeOrganization,
        organizationRole: 'owner',
        userId: 'user_files_test',
      })}`;
    const upload = await request(app.getHttpServer())
      .post(`/v1/organizations/${organization.id}/files`)
      .set('authorization', token(organization))
      .attach('file', Buffer.from('%PDF-1.7\ncontents'), {
        contentType: 'application/pdf',
        filename: 'report.pdf',
      })
      .expect(201);
    expect(upload.body).toMatchObject({
      name: 'report.pdf',
      contentType: 'application/pdf',
    });
    const accesses = storage.accesses.length;

    await request(app.getHttpServer())
      .get(`/v1/organizations/${otherOrganization.id}/files`)
      .set('authorization', token(otherOrganization))
      .expect(200)
      .expect({ items: [] });
    await request(app.getHttpServer())
      .get(
        `/v1/organizations/${otherOrganization.id}/files/${upload.body.id}/download`,
      )
      .set('authorization', token(otherOrganization))
      .expect(404);
    expect(storage.accesses).toHaveLength(accesses);

    await request(app.getHttpServer())
      .delete(
        `/v1/organizations/${otherOrganization.id}/files/${upload.body.id}`,
      )
      .set('authorization', token(otherOrganization))
      .expect(404);
    expect(storage.accesses).toHaveLength(accesses);

    const download = await request(app.getHttpServer())
      .get(
        `/v1/organizations/${organization.id}/files/${upload.body.id}/download`,
      )
      .set('authorization', token(organization))
      .expect(200);
    expect(download.body.url).toMatch(/^https:\/\/files\.test\//);
    expect(
      new Date(download.body.expiresAt).getTime() - Date.now(),
    ).toBeLessThanOrEqual(60_000);

    await request(app.getHttpServer())
      .delete(`/v1/organizations/${organization.id}/files/${upload.body.id}`)
      .set('authorization', token(organization))
      .expect(204);
    expect(
      (
        await auditEvents.list({ limit: 10, organizationId: organization.id })
      ).map(({ action }) => action),
    ).toEqual([
      'organization.file.delete-requested',
      'organization.file.download-requested',
      'organization.file.upload-requested',
    ]);
  });
});
