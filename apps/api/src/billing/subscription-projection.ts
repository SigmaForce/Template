import {
  isDelinquentSubscriptionStatus,
  type BillingInboxEvent,
  type SubscriptionProjection,
} from './billing.js';

export type StripePlanMappings = Record<
  'launch' | 'scale',
  { priceId: string; productId: string }
>;

export type BillingInboxRecord = Omit<BillingInboxEvent, 'payload'>;
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
  event: BillingInboxRecord & { organizationId: string },
  current: SubscriptionProjection | undefined,
  planMappings: StripePlanMappings,
): SubscriptionProjection | undefined {
  if (event.type.startsWith('subscription_schedule.')) {
    if (
      !current ||
      current.providerSubscriptionId !== event.providerSubscriptionId
    ) {
      throw new Error('Subscription schedule has no projected Subscription.');
    }
    if (
      current.providerScheduleEventCreatedAt &&
      current.providerScheduleEventCreatedAt.getTime() >=
        event.createdAt.getTime()
    ) {
      return undefined;
    }
    const scheduledPlanId = event.scheduledPriceId
      ? planIdForPrice(event.scheduledPriceId, planMappings)
      : undefined;
    return {
      ...current,
      providerScheduleEventCreatedAt: event.createdAt,
      ...(event.providerCustomerId && {
        providerCustomerId: event.providerCustomerId,
      }),
      scheduledPlanId,
    };
  }
  if (
    current &&
    current.providerEventCreatedAt.getTime() >= event.createdAt.getTime()
  ) {
    return undefined;
  }
  if (!event.priceId || !event.currentPeriodEndsAt || !event.status) {
    throw new Error('Stripe Subscription event is incomplete.');
  }
  const plan = planIdForPrice(event.priceId, planMappings);

  return {
    cancelAtPeriodEnd: event.cancelAtPeriodEnd,
    currentPeriodEndsAt: event.currentPeriodEndsAt,
    organizationId: event.organizationId,
    ...(isDelinquentSubscriptionStatus(event.status) && {
      pastDueAt: current?.pastDueAt ?? event.createdAt,
    }),
    planId: plan,
    planVersion: 1,
    providerEventCreatedAt: event.createdAt,
    ...(current?.providerScheduleEventCreatedAt && {
      providerScheduleEventCreatedAt: current.providerScheduleEventCreatedAt,
    }),
    ...(event.providerCustomerId && {
      providerCustomerId: event.providerCustomerId,
    }),
    providerSubscriptionId: event.providerSubscriptionId,
    ...(current?.scheduledPlanId && {
      scheduledPlanId: current.scheduledPlanId,
    }),
    status: event.status,
  };
}

function planIdForPrice(priceId: string, planMappings: StripePlanMappings) {
  const plan = Object.entries(planMappings).find(
    ([, mapping]) => mapping.priceId === priceId,
  )?.[0] as 'launch' | 'scale' | undefined;
  if (!plan) throw new Error('Stripe price is not mapped to a Plan.');
  return plan;
}
