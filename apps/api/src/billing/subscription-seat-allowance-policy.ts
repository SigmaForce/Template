import { SeatAllowancePolicy } from '../organizations/organization.js';
import { BillingRepository } from './billing.js';
import { findPlan } from './plan-catalog.js';

export class SubscriptionSeatAllowancePolicy extends SeatAllowancePolicy {
  constructor(private readonly subscriptions: BillingRepository) {
    super();
  }

  async findAllowance(organizationId: string) {
    const subscription =
      await this.subscriptions.findSubscription(organizationId);
    return subscription
      ? findPlan(subscription.planId, subscription.planVersion)?.seatAllowance
      : undefined;
  }
}
