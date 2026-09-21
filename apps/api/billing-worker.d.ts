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
  createdAt: Date;
  currentPeriodEndsAt: Date;
  id: string;
  organizationId: string;
  priceId: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
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
