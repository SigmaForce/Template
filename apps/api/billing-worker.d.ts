import type { JsonLogger } from '@saas/tooling-config/logging';

export type StripePlanMappings = Record<
  'launch' | 'scale',
  { priceId: string; productId: string }
>;

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid';

export interface BillingInboxRecord {
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  currentPeriodEndsAt?: Date;
  id: string;
  organizationId?: string;
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
  providerCustomerId?: string;
  providerScheduleEventCreatedAt?: Date;
  providerSubscriptionId: string;
  scheduledPlanId?: 'launch' | 'scale';
  status: SubscriptionStatus;
}

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
): SubscriptionProjection | undefined;

export class PostgresBillingProjectionRepository extends BillingProjectionRepository {
  constructor(connectionString: string);
  project(
    eventId: string,
    planMappings: StripePlanMappings,
  ): Promise<{
    organizationId: string;
    outcome: 'already-processed' | 'ignored-delayed' | 'projected';
  }>;
  findSubscription(
    organizationId: string,
  ): Promise<SubscriptionProjection | undefined>;
  findReplaySubscription(
    input: { organizationId: string; providerSubscriptionId: string },
    planMappings: StripePlanMappings,
  ): Promise<SubscriptionProjection | undefined>;
  rebuildSubscription(
    input: { organizationId: string; providerSubscriptionId: string },
    planMappings: StripePlanMappings,
  ): Promise<SubscriptionProjection | undefined>;
  close(): Promise<void>;
}

export class SubscriptionProjector {
  constructor(
    repository: BillingProjectionRepository,
    planMappings: StripePlanMappings,
    logger?: JsonLogger,
  );
  process(eventId: string): Promise<void>;
}
