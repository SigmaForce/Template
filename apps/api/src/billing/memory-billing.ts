import {
  BillingProjectionQueue,
  BillingRepository,
  type BillingInboxEvent,
  type SubscriptionProjection,
} from './billing.js';

export class MemoryBillingRepository extends BillingRepository {
  readonly events = new Map<string, BillingInboxEvent>();
  readonly subscriptions = new Map<string, SubscriptionProjection>();

  async storeEvent(event: BillingInboxEvent) {
    if (this.events.has(event.id)) return 'duplicate' as const;
    this.events.set(event.id, event);
    return 'stored' as const;
  }

  async findSubscription(organizationId: string) {
    return this.subscriptions.get(organizationId);
  }
}

export class MemoryBillingProjectionQueue extends BillingProjectionQueue {
  readonly eventIds: string[] = [];

  async enqueue(eventId: string) {
    if (this.eventIds.includes(eventId)) return;
    this.eventIds.push(eventId);
  }
}
