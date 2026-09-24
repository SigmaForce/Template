import {
  BillingProjectionQueue,
  BillingRepository,
  type BillingInboxEvent,
  type SubscriptionProjection,
} from './billing.js';
import {
  nextSubscriptionProjection,
  type StripePlanMappings,
} from './subscription-projection.js';

export class MemoryBillingRepository extends BillingRepository {
  readonly events = new Map<string, BillingInboxEvent>();
  readonly subscriptions = new Map<string, SubscriptionProjection>();
  readonly processedEventIds = new Set<string>();

  async storeEvent(event: BillingInboxEvent) {
    if (this.events.has(event.id)) return 'duplicate' as const;
    this.events.set(event.id, event);
    return 'stored' as const;
  }

  async findSubscription(organizationId: string) {
    return this.subscriptions.get(organizationId);
  }

  async findUnscopedEventIds(providerSubscriptionId: string) {
    return [...this.events.values()]
      .filter(
        (event) =>
          !event.organizationId &&
          event.providerSubscriptionId === providerSubscriptionId &&
          !this.processedEventIds.has(event.id),
      )
      .map((event) => event.id);
  }

  async project(eventId: string, planMappings: StripePlanMappings) {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Billing event was not found.');
    const current = event.organizationId
      ? this.subscriptions.get(event.organizationId)
      : [...this.subscriptions.values()].find(
          (subscription) =>
            subscription.providerSubscriptionId ===
            event.providerSubscriptionId,
        );
    const organizationId = event.organizationId ?? current?.organizationId;
    if (!organizationId) {
      throw new Error('Stripe event Subscription is unavailable.');
    }
    if (this.processedEventIds.has(eventId)) {
      return {
        organizationId,
        outcome: 'already-processed' as const,
      };
    }
    const next = nextSubscriptionProjection(
      { ...event, organizationId },
      current,
      planMappings,
    );
    this.processedEventIds.add(eventId);
    if (!next) {
      return {
        organizationId,
        outcome: 'ignored-delayed' as const,
      };
    }
    this.subscriptions.set(organizationId, next);
    return {
      organizationId,
      outcome: 'projected' as const,
    };
  }
}

export class MemoryBillingProjectionQueue extends BillingProjectionQueue {
  readonly eventIds: string[] = [];

  async enqueue(eventId: string, wakeEventId?: string) {
    if (!wakeEventId && this.eventIds.includes(eventId)) return;
    this.eventIds.push(eventId);
  }
}
