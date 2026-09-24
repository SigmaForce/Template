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
}

export abstract class BillingProjectionQueue {
  abstract enqueue(eventId: string): Promise<void>;
}
