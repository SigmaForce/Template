import {
  OrganizationStatePolicy,
  type OrganizationAccessState,
} from '../authorization/authorization.js';
import {
  BillingRepository,
  isDelinquentSubscriptionStatus,
} from './billing.js';

const gracePeriodMilliseconds = 7 * 24 * 60 * 60 * 1_000;

export class SubscriptionOrganizationStatePolicy extends OrganizationStatePolicy {
  constructor(
    private readonly subscriptions: BillingRepository,
    private readonly now = () => new Date(),
  ) {
    super();
  }

  async resolve(input: {
    organizationId: string;
    state: OrganizationAccessState;
  }) {
    if (input.state !== 'active') return input.state;

    const subscription = await this.subscriptions.findSubscription(
      input.organizationId,
    );
    return subscription &&
      isDelinquentSubscriptionStatus(subscription.status) &&
      subscription.pastDueAt &&
      this.now().getTime() >=
        subscription.pastDueAt.getTime() + gracePeriodMilliseconds
      ? 'read-only'
      : input.state;
  }
}
