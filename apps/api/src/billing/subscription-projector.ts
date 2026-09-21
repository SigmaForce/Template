import type { JsonLogger } from '@saas/tooling-config/logging';
import {
  BillingProjectionRepository,
  type StripePlanMappings,
} from './subscription-projection.js';

export class SubscriptionProjector {
  constructor(
    private readonly repository: BillingProjectionRepository,
    private readonly planMappings: StripePlanMappings,
    private readonly logger?: JsonLogger,
  ) {}

  async process(eventId: string) {
    if (!/^evt_[A-Za-z0-9_]+$/.test(eventId)) {
      throw new Error('Billing projection job has an invalid event ID.');
    }
    const result = await this.repository.project(eventId, this.planMappings);
    this.logger?.log({
      event: 'billing.subscription.projection.completed',
      eventId,
      ...result,
    });
  }
}
