import { Pool } from 'pg';
import {
  PostgresBillingProjectionRepository,
  SubscriptionProjector,
} from '@saas/api/billing-worker';

const databaseUrl = process.env.TEST_DATABASE_URL;
const organizationId = 'org_worker_projection';
const planMappings = {
  launch: { priceId: 'price_launchTest', productId: 'prod_launchTest' },
  scale: { priceId: 'price_scaleTest', productId: 'prod_scaleTest' },
};

describe.skipIf(!databaseUrl)('Subscription projection with PostgreSQL', () => {
  let pool: Pool;
  let repository: PostgresBillingProjectionRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query(
      'TRUNCATE billing_inbox_events, subscriptions, organizations CASCADE',
    );
    await pool.query(
      `INSERT INTO organizations (id, name, slug, locale, time_zone, updated_at)
       VALUES ($1, 'Worker Projection', 'worker-projection', 'en-US', 'UTC', CURRENT_TIMESTAMP)`,
      [organizationId],
    );
    await pool.query(
      `INSERT INTO billing_inbox_events
         (event_id, type, provider_subscription_id, scheduled_price_id,
          cancel_at_period_end, provider_created_at, payload)
       VALUES ('evt_worker_schedule', 'subscription_schedule.created',
               'sub_worker', 'price_scaleTest', false,
               '2026-09-22T12:00:00Z', '{}')`,
    );
    await pool.query(
      `INSERT INTO billing_inbox_events
         (event_id, organization_id, type, provider_subscription_id, price_id,
          subscription_status, current_period_ends_at, provider_created_at, payload)
       VALUES
         ('evt_worker_newer', $1, 'customer.subscription.updated', 'sub_worker',
          'price_launchTest', 'active', '2026-11-01T00:00:00Z',
          '2026-09-21T12:00:00Z', '{}'),
         ('evt_worker_older', $1, 'customer.subscription.updated', 'sub_worker',
          'price_scaleTest', 'canceled', '2026-10-01T00:00:00Z',
          '2026-09-20T12:00:00Z', '{}')`,
      [organizationId],
    );
    repository = new PostgresBillingProjectionRepository(databaseUrl!);
  });

  it('projects once and cannot be regressed by a delayed event', async () => {
    const projector = new SubscriptionProjector(repository, planMappings);
    await projector.process('evt_worker_newer');
    await projector.process('evt_worker_newer');
    await projector.process('evt_worker_schedule');
    await projector.process('evt_worker_older');

    expect(await repository.findSubscription(organizationId)).toMatchObject({
      organizationId,
      planId: 'launch',
      scheduledPlanId: 'scale',
      status: 'active',
    });
    const processed = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM billing_inbox_events WHERE processed_at IS NOT NULL',
    );
    expect(processed.rows[0]?.count).toBe('3');
  });

  afterAll(async () => {
    await repository.close();
    await pool.end();
  });
});
