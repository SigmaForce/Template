import {
  Capability,
  CapabilityPolicy,
  type CapabilityId,
} from '../authorization/authorization.js';
import { BillingRepository } from './billing.js';
import { planCatalog } from './plan-catalog.js';

export class SubscriptionCapabilityPolicy extends CapabilityPolicy {
  constructor(private readonly subscriptions: BillingRepository) {
    super();
  }

  async isEnabled(input: { capability: CapabilityId; organizationId: string }) {
    if (input.capability === Capability.billing) return true;

    const subscription = await this.subscriptions.findSubscription(
      input.organizationId,
    );
    if (
      !subscription ||
      !['active', 'past_due', 'trialing'].includes(subscription.status)
    ) {
      return false;
    }
    const plan = planCatalog.plans.find(
      ({ id, version }) =>
        id === subscription.planId && version === subscription.planVersion,
    );
    return plan?.capabilities.includes(input.capability) ?? false;
  }
}
