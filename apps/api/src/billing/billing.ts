export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid';

export interface BillingInboxEvent {
  createdAt: Date;
  currentPeriodEndsAt: Date;
  id: string;
  organizationId: string;
  payload: object;
  priceId: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  type: 'customer.subscription.updated';
}

export interface SubscriptionProjection {
  currentPeriodEndsAt: Date;
  organizationId: string;
  planId: 'launch' | 'scale';
  planVersion: number;
  providerEventCreatedAt: Date;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
}

export abstract class BillingRepository {
  abstract storeEvent(
    event: BillingInboxEvent,
  ): Promise<'duplicate' | 'stored'>;
  abstract findSubscription(
    organizationId: string,
  ): Promise<SubscriptionProjection | undefined>;
}

export abstract class BillingProjectionQueue {
  abstract enqueue(eventId: string): Promise<void>;
}
