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

  async project(eventId: string, planMappings: StripePlanMappings) {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Billing event was not found.');
    if (this.processedEventIds.has(eventId)) {
      return {
        organizationId: event.organizationId,
        outcome: 'already-processed' as const,
      };
    }
    const next = nextSubscriptionProjection(
      event,
      this.subscriptions.get(event.organizationId),
      planMappings,
    );
    this.processedEventIds.add(eventId);
    if (!next) {
      return {
        organizationId: event.organizationId,
        outcome: 'ignored-delayed' as const,
      };
    }
    this.subscriptions.set(event.organizationId, next);
    return {
      organizationId: event.organizationId,
      outcome: 'projected' as const,
    };
  }
}

export class MemoryBillingProjectionQueue extends BillingProjectionQueue {
  readonly eventIds: string[] = [];

  async enqueue(eventId: string) {
    if (this.eventIds.includes(eventId)) return;
    this.eventIds.push(eventId);
  }
}
