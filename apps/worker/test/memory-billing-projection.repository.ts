import {
  BillingProjectionRepository,
  nextSubscriptionProjection,
  type BillingInboxRecord,
  type StripePlanMappings,
  type SubscriptionProjection,
} from '@saas/api/billing-worker';

export class MemoryBillingProjectionRepository extends BillingProjectionRepository {
  private readonly events: Map<string, BillingInboxRecord>;
  private readonly subscriptions = new Map<string, SubscriptionProjection>();
  readonly processedEventIds = new Set<string>();

  constructor(events: BillingInboxRecord[] = []) {
    super();
    this.events = new Map(events.map((event) => [event.id, event]));
  }

  async project(eventId: string, planMappings: StripePlanMappings) {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Billing inbox event is unavailable.');
    if (!event.organizationId) {
      throw new Error('Billing inbox event has no Organization.');
    }
    if (this.processedEventIds.has(eventId)) {
      return {
        organizationId: event.organizationId,
        outcome: 'already-processed' as const,
      };
    }
    const next = nextSubscriptionProjection(
      { ...event, organizationId: event.organizationId },
      this.subscriptions.get(event.organizationId),
      planMappings,
    );
    if (next) this.subscriptions.set(event.organizationId, next);
    this.processedEventIds.add(eventId);
    return {
      organizationId: event.organizationId,
      outcome: next ? ('projected' as const) : ('ignored-delayed' as const),
    };
  }

  async findSubscription(organizationId: string) {
    return this.subscriptions.get(organizationId);
  }
}
