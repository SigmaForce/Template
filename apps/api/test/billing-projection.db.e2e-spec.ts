import { createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApi } from '../src/configure-api.js';
import { MemoryBillingProjectionQueue } from '../src/billing/memory-billing.js';
import { PrismaBillingRepository } from '../src/billing/prisma-billing.repository.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from '../src/organizations/memory-organizations.js';
import { authenticationPublicKey } from './session-token.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const organization = {
  id: 'org_billing_projection',
  slug: 'billing-projection',
};
const planMappings = {
  launch: { priceId: 'price_launchTest', productId: 'prod_launchTest' },
  scale: { priceId: 'price_scaleTest', productId: 'prod_scaleTest' },
};

describe.skipIf(!databaseUrl)(
  'Stripe billing projection with PostgreSQL',
  () => {
    let app: INestApplication;
    let pool: Pool;
    const queue = new MemoryBillingProjectionQueue();

    beforeAll(async () => {
      pool = new Pool({ connectionString: databaseUrl });
      await pool.query(
        'TRUNCATE billing_inbox_events, subscriptions, organizations CASCADE',
      );
      await pool.query(
        `INSERT INTO organizations (id, name, slug, locale, time_zone, updated_at)
       VALUES ($1, 'Billing Projection', $2, 'en-US', 'UTC', CURRENT_TIMESTAMP)`,
        [organization.id, organization.slug],
      );
      const organizationRepository = new MemoryOrganizationRepository();
      const moduleFixture = await Test.createTestingModule({
        imports: [
          AppModule.register({
            authentication: {
              authorizedParties: ['http://localhost:3000'],
              jwtKey: authenticationPublicKey,
            },
            billing: {
              projectionQueue: queue,
              repository: new PrismaBillingRepository(databaseUrl!),
              stripeWebhookSecret: 'whsec_testWebhookSecret',
            },
            organizations: {
              directory: new MemoryOrganizationDirectory(),
              repository: organizationRepository,
            },
          }),
        ],
      }).compile();
      app = moduleFixture.createNestApplication({ rawBody: true });
      configureApi(app);
      await app.init();
    });

    it('persists one inbox row for repeated signed delivery', async () => {
      const payload = JSON.stringify({
        id: 'evt_postgres_projection',
        type: 'customer.subscription.updated',
        created: 1_789_473_600,
        data: {
          object: {
            id: 'sub_postgres_projection',
            status: 'active',
            current_period_end: 1_792_065_600,
            metadata: { organizationId: organization.id },
            items: { data: [{ price: { id: planMappings.launch.priceId } }] },
          },
        },
      });
      const timestamp = Math.floor(Date.now() / 1_000);
      const signature = createHmac('sha256', 'whsec_testWebhookSecret')
        .update(`${timestamp}.${payload}`)
        .digest('hex');
      const send = () =>
        request(app.getHttpServer())
          .post('/v1/billing/stripe/webhooks')
          .set('content-type', 'application/json')
          .set('stripe-signature', `t=${timestamp},v1=${signature}`)
          .send(payload)
          .expect(200);

      await send();
      await send();
      expect(queue.eventIds).toEqual(['evt_postgres_projection']);
      expect(
        (
          await pool.query(
            'SELECT event_id FROM billing_inbox_events WHERE event_id = $1',
            ['evt_postgres_projection'],
          )
        ).rowCount,
      ).toBe(1);
    });

    afterAll(async () => {
      await app.close();
      await pool.end();
    });
  },
);
