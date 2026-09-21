import type { BillingInboxEvent, SubscriptionProjection } from './billing.js';

export type StripePlanMappings = Record<
  'launch' | 'scale',
  { priceId: string; productId: string }
>;

export type BillingInboxRecord = Omit<BillingInboxEvent, 'payload' | 'type'>;
export type { SubscriptionProjection } from './billing.js';

export abstract class BillingProjectionRepository {
  abstract project(
    eventId: string,
    planMappings: StripePlanMappings,
  ): Promise<{
    organizationId: string;
    outcome: 'already-processed' | 'ignored-delayed' | 'projected';
  }>;

  abstract findSubscription(
    organizationId: string,
  ): Promise<SubscriptionProjection | undefined>;
}

export function nextSubscriptionProjection(
  event: BillingInboxRecord,
  current: SubscriptionProjection | undefined,
  planMappings: StripePlanMappings,
): SubscriptionProjection | undefined {
  if (
    current &&
    current.providerEventCreatedAt.getTime() >= event.createdAt.getTime()
  ) {
    return undefined;
  }
  const plan = Object.entries(planMappings).find(
    ([, mapping]) => mapping.priceId === event.priceId,
  )?.[0] as 'launch' | 'scale' | undefined;
  if (!plan) throw new Error('Stripe price is not mapped to a Plan.');

  return {
    currentPeriodEndsAt: event.currentPeriodEndsAt,
    organizationId: event.organizationId,
    planId: plan,
    planVersion: 1,
    providerEventCreatedAt: event.createdAt,
    providerSubscriptionId: event.providerSubscriptionId,
    status: event.status,
  };
}
