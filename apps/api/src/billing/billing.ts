export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid';

const subscriptionStatuses = new Set<SubscriptionStatus>([
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
]);

export function isSubscriptionStatus(
  status: unknown,
): status is SubscriptionStatus {
  return (
    typeof status === 'string' &&
    subscriptionStatuses.has(status as SubscriptionStatus)
  );
}

export function isDelinquentSubscriptionStatus(
  status: SubscriptionStatus,
): status is 'past_due' | 'unpaid' {
  return status === 'past_due' || status === 'unpaid';
}

export interface BillingInboxEvent {
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  currentPeriodEndsAt?: Date;
  id: string;
  organizationId?: string;
  payload: object;
  priceId?: string;
  providerCustomerId?: string;
  providerSubscriptionId: string;
  scheduledPriceId?: string;
  status?: SubscriptionStatus;
  type:
    | 'customer.subscription.created'
    | 'customer.subscription.deleted'
    | 'customer.subscription.updated'
    | 'subscription_schedule.created'
    | 'subscription_schedule.updated';
}

export interface SubscriptionProjection {
  cancelAtPeriodEnd?: boolean;
  currentPeriodEndsAt: Date;
  organizationId: string;
  pastDueAt?: Date;
  planId: 'launch' | 'scale';
  planVersion: number;
  providerEventCreatedAt: Date;
  providerScheduleEventCreatedAt?: Date;
  providerCustomerId?: string;
  providerSubscriptionId: string;
  scheduledPlanId?: 'launch' | 'scale';
  status: SubscriptionStatus;
}

export abstract class BillingRepository {
  abstract storeEvent(
    event: BillingInboxEvent,
  ): Promise<'duplicate' | 'stored'>;
  abstract findSubscription(
    organizationId: string,
  ): Promise<SubscriptionProjection | undefined>;
  abstract findUnscopedEventIds(
    providerSubscriptionId: string,
  ): Promise<string[]>;
}

export abstract class BillingProjectionQueue {
  abstract enqueue(eventId: string, wakeEventId?: string): Promise<void>;
}
