import { describe, expect, it, vi } from 'vitest';
import {
  BillingOperatorAuthorizationError,
  StripeSubscriptionAuthority,
  SubscriptionAuthority,
  SubscriptionReconciliationService,
  type SubscriptionAuthoritySnapshot,
} from '../src/billing/subscription-reconciliation.js';
import {
  BillingProjectionRepository,
  type StripePlanMappings,
} from '../src/billing/subscription-projection.js';
import type { SubscriptionProjection } from '../src/billing/billing.js';

const planMappings: StripePlanMappings = {
  launch: { priceId: 'price_launchTest', productId: 'prod_launchTest' },
  scale: { priceId: 'price_scaleTest', productId: 'prod_scaleTest' },
};

class ReconciliationProjectionRepository extends BillingProjectionRepository {
  constructor(
    protected subscription: SubscriptionProjection,
    private readonly replay: SubscriptionProjection = subscription,
  ) {
    super();
  }

  async findSubscription() {
    return this.subscription;
  }

  async project(): Promise<{
    organizationId: string;
    outcome: 'projected';
  }> {
    throw new Error('Not used by reconciliation tests.');
  }

  async findReplaySubscription() {
    return this.replay;
  }

  async rebuildSubscription() {
    this.subscription = this.replay;
    return this.subscription;
  }
}

class ReconciliationAuthority extends SubscriptionAuthority {
  constructor(private readonly subscription: SubscriptionAuthoritySnapshot) {
    super();
  }

  async findSubscription() {
    return this.subscription;
  }
}

describe('Subscription reconciliation', () => {
  it('reads the authoritative Organization-scoped Subscription from Stripe', async () => {
    const request = vi.fn(
      async (_input: string | URL | Request, _options?: RequestInit) =>
        new Response(
          JSON.stringify({
            id: 'sub_reconciliation',
            cancel_at_period_end: false,
            customer: 'cus_reconciliation',
            items: {
              data: [
                {
                  current_period_end: 1_792_065_600,
                  price: { id: 'price_scaleTest' },
                },
              ],
            },
            metadata: { organizationId: 'org_reconciliation' },
            schedule: {
              current_phase: { end_date: 1_792_065_600 },
              phases: [
                {
                  start_date: 1_792_065_600,
                  items: [{ price: 'price_launchTest' }],
                },
              ],
            },
            status: 'active',
          }),
          { status: 200 },
        ),
    );

    await expect(
      new StripeSubscriptionAuthority(
        'sk_test_serverOnlySecret',
        planMappings,
        request,
      ).findSubscription('sub_reconciliation'),
    ).resolves.toEqual({
      cancelAtPeriodEnd: false,
      currentPeriodEndsAt: new Date('2026-10-15T12:00:00.000Z'),
      organizationId: 'org_reconciliation',
      planId: 'scale',
      planVersion: 1,
      providerCustomerId: 'cus_reconciliation',
      providerSubscriptionId: 'sub_reconciliation',
      scheduledPlanId: 'launch',
      status: 'active',
    });
    expect(request).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/subscriptions/sub_reconciliation?expand%5B%5D=schedule',
      { headers: { authorization: 'Bearer sk_test_serverOnlySecret' } },
    );
  });

  it('identifies Stripe drift without changing the local projection', async () => {
    const projections = new ReconciliationProjectionRepository({
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: 'org_reconciliation',
      planId: 'launch',
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_reconciliation',
      status: 'active',
    });
    const service = new SubscriptionReconciliationService({
      authority: new ReconciliationAuthority({
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_reconciliation',
        planId: 'scale',
        planVersion: 1,
        providerSubscriptionId: 'sub_reconciliation',
        status: 'active',
      }),
      authorize: async () => ({ operatorId: 'operator_reconciliation' }),
      planMappings,
      projections,
    });

    await expect(
      service.reconcile({
        credential: 'operator-token',
        organizationId: 'org_reconciliation',
        providerSubscriptionId: 'sub_reconciliation',
      }),
    ).resolves.toEqual({
      differences: ['planId'],
      organizationId: 'org_reconciliation',
      providerSubscriptionId: 'sub_reconciliation',
      status: 'drifted',
    });
    expect((await projections.findSubscription()).planId).toBe('launch');
  });

  it('repairs idempotently from durable events and records the authorized replay', async () => {
    const projections = new ReconciliationProjectionRepository(
      {
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_repair',
        planId: 'launch',
        planVersion: 1,
        providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
        providerSubscriptionId: 'sub_repair',
        status: 'active',
      },
      {
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_repair',
        planId: 'scale',
        planVersion: 1,
        providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
        providerSubscriptionId: 'sub_repair',
        status: 'active',
      },
    );
    const auditEvents: object[] = [];
    const service = new SubscriptionReconciliationService({
      audit: async (event) => {
        auditEvents.push(event);
      },
      authority: new ReconciliationAuthority({
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_repair',
        planId: 'scale',
        planVersion: 1,
        providerSubscriptionId: 'sub_repair',
        status: 'active',
      }),
      authorize: async () => ({ operatorId: 'operator_repair' }),
      now: () => new Date('2026-09-24T17:00:00.000Z'),
      planMappings,
      projections,
    });
    const input = {
      credential: 'operator-token',
      organizationId: 'org_repair',
      providerSubscriptionId: 'sub_repair',
    };

    await expect(service.repair(input)).resolves.toMatchObject({
      differences: [],
      status: 'in-sync',
    });
    await expect(service.repair(input)).resolves.toMatchObject({
      differences: [],
      status: 'in-sync',
    });
    expect(await projections.findSubscription()).toMatchObject({
      organizationId: 'org_repair',
      planId: 'scale',
    });
    expect(auditEvents).toEqual([
      {
        action: 'billing.subscription.replay-requested',
        actor: { id: 'operator_repair', type: 'operator' },
        occurredAt: new Date('2026-09-24T17:00:00.000Z'),
        organizationId: 'org_repair',
        target: { id: 'sub_repair', type: 'subscription' },
      },
    ]);
  });

  it('detects Grace Period drift from signed durable history', async () => {
    const subscription = {
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: 'org_grace_drift',
      pastDueAt: new Date('2026-09-10T12:00:00.000Z'),
      planId: 'launch' as const,
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_grace_drift',
      status: 'past_due' as const,
    };
    const projections = new ReconciliationProjectionRepository(subscription, {
      ...subscription,
      pastDueAt: new Date('2026-09-20T12:00:00.000Z'),
    });
    const service = new SubscriptionReconciliationService({
      audit: async () => undefined,
      authority: new ReconciliationAuthority({
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt,
        organizationId: subscription.organizationId,
        planId: subscription.planId,
        planVersion: subscription.planVersion,
        providerSubscriptionId: subscription.providerSubscriptionId,
        status: subscription.status,
      }),
      authorize: async () => ({ operatorId: 'operator_grace' }),
      planMappings,
      projections,
    });
    const input = {
      credential: 'operator-token',
      organizationId: subscription.organizationId,
      providerSubscriptionId: subscription.providerSubscriptionId,
    };

    await expect(service.reconcile(input)).resolves.toMatchObject({
      differences: ['pastDueAt'],
      status: 'drifted',
    });
    await expect(service.repair(input)).resolves.toMatchObject({
      differences: [],
      status: 'in-sync',
    });
  });

  it('disables repair until the Audit Event extension is available', async () => {
    const projections = new ReconciliationProjectionRepository({
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: 'org_no_audit',
      planId: 'launch',
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_no_audit',
      status: 'active',
    });
    const service = new SubscriptionReconciliationService({
      authority: new ReconciliationAuthority({
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_no_audit',
        planId: 'scale',
        planVersion: 1,
        providerSubscriptionId: 'sub_no_audit',
        status: 'active',
      }),
      authorize: async () => ({ operatorId: 'operator_no_audit' }),
      planMappings,
      projections,
    });

    await expect(
      service.repair({
        credential: 'operator-token',
        organizationId: 'org_no_audit',
        providerSubscriptionId: 'sub_no_audit',
      }),
    ).rejects.toThrow('Audit Event extension is required for repair.');
    expect(await projections.findSubscription()).toMatchObject({
      planId: 'launch',
    });
  });

  it('rejects repair without separate Operator authorization', async () => {
    const projections = new ReconciliationProjectionRepository({
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: 'org_denied_repair',
      planId: 'launch',
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_denied_repair',
      status: 'active',
    });
    const service = new SubscriptionReconciliationService({
      authority: new ReconciliationAuthority({
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_denied_repair',
        planId: 'scale',
        planVersion: 1,
        providerSubscriptionId: 'sub_denied_repair',
        status: 'active',
      }),
      authorize: async () => undefined,
      planMappings,
      projections,
    });

    await expect(
      service.repair({
        credential: 'organization-owner-session',
        organizationId: 'org_denied_repair',
        providerSubscriptionId: 'sub_denied_repair',
      }),
    ).rejects.toBeInstanceOf(BillingOperatorAuthorizationError);
    expect(await projections.findSubscription()).toMatchObject({
      planId: 'launch',
    });
  });

  it('does not repair when the enabled Audit Event writer fails', async () => {
    const projections = new ReconciliationProjectionRepository({
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: 'org_audit_failure',
      planId: 'launch',
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_audit_failure',
      status: 'active',
    });
    const service = new SubscriptionReconciliationService({
      audit: async () => {
        throw new Error('Audit Event unavailable.');
      },
      authority: new ReconciliationAuthority({
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_audit_failure',
        planId: 'scale',
        planVersion: 1,
        providerSubscriptionId: 'sub_audit_failure',
        status: 'active',
      }),
      authorize: async () => ({ operatorId: 'operator_audit_failure' }),
      planMappings,
      projections,
    });

    await expect(
      service.repair({
        credential: 'operator-token',
        organizationId: 'org_audit_failure',
        providerSubscriptionId: 'sub_audit_failure',
      }),
    ).rejects.toThrow('Audit Event unavailable.');
    expect(await projections.findSubscription()).toMatchObject({
      planId: 'launch',
    });
  });

  it('will not reconcile or repair Stripe authority from another Organization', async () => {
    const projections = new ReconciliationProjectionRepository({
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: 'org_isolated',
      planId: 'launch',
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_isolated',
      status: 'active',
    });
    const service = new SubscriptionReconciliationService({
      authority: new ReconciliationAuthority({
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
        organizationId: 'org_other',
        planId: 'scale',
        planVersion: 1,
        providerSubscriptionId: 'sub_isolated',
        status: 'active',
      }),
      authorize: async () => ({ operatorId: 'operator_isolation' }),
      planMappings,
      projections,
    });

    await expect(
      service.repair({
        credential: 'operator-token',
        organizationId: 'org_isolated',
        providerSubscriptionId: 'sub_isolated',
      }),
    ).resolves.toEqual({
      differences: [],
      organizationId: 'org_isolated',
      providerSubscriptionId: 'sub_isolated',
      status: 'authority-organization-mismatch',
    });
    expect(await projections.findSubscription()).toMatchObject({
      planId: 'launch',
    });
  });
});
