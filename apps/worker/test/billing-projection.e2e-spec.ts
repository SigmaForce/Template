import { JsonLogger } from '@saas/tooling-config/logging';
import { SubscriptionProjector } from '@saas/api/billing-worker';
import { MemoryBillingProjectionRepository } from './memory-billing-projection.repository.js';

describe('Stripe Subscription projection', () => {
  it('is idempotent, ignores delayed state, and logs no provider payload', async () => {
    const repository = new MemoryBillingProjectionRepository([
      {
        cancelAtPeriodEnd: false,
        createdAt: new Date('2026-09-20T12:00:00.000Z'),
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        id: 'evt_active_newer',
        organizationId: 'org_northstar',
        priceId: 'price_launchTest',
        providerSubscriptionId: 'sub_northstar',
        status: 'active',
        type: 'customer.subscription.updated',
      },
      {
        cancelAtPeriodEnd: false,
        createdAt: new Date('2026-09-19T12:00:00.000Z'),
        currentPeriodEndsAt: new Date('2026-09-30T12:00:00.000Z'),
        id: 'evt_canceled_older',
        organizationId: 'org_northstar',
        priceId: 'price_scaleTest',
        providerSubscriptionId: 'sub_northstar',
        status: 'canceled',
        type: 'customer.subscription.updated',
      },
    ]);
    const lines: string[] = [];
    const projector = new SubscriptionProjector(
      repository,
      {
        launch: {
          priceId: 'price_launchTest',
          productId: 'prod_launchTest',
        },
        scale: {
          priceId: 'price_scaleTest',
          productId: 'prod_scaleTest',
        },
      },
      new JsonLogger({
        environment: 'test',
        level: 'info',
        service: 'worker',
        write: (line) => lines.push(line),
      }),
    );

    await projector.process('evt_active_newer');
    await projector.process('evt_active_newer');
    await projector.process('evt_canceled_older');

    expect(await repository.findSubscription('org_northstar')).toEqual({
      cancelAtPeriodEnd: false,
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: 'org_northstar',
      planId: 'launch',
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_northstar',
      status: 'active',
    });
    expect(repository.processedEventIds).toEqual(
      new Set(['evt_active_newer', 'evt_canceled_older']),
    );
    expect(lines).toHaveLength(3);
    expect(lines.join('\n')).not.toMatch(
      /payload|signature|current_period_end/i,
    );
  });
});
