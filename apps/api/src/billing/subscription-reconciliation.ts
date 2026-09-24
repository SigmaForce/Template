import {
  isSubscriptionStatus,
  type SubscriptionProjection,
  type SubscriptionStatus,
} from './billing.js';
import {
  BillingProjectionRepository,
  planIdForPrice,
  type StripePlanMappings,
} from './subscription-projection.js';
import { scheduledPriceIdFromStripeSchedule } from './stripe-webhook.js';

export interface SubscriptionAuthoritySnapshot {
  cancelAtPeriodEnd: boolean;
  currentPeriodEndsAt: Date;
  organizationId: string;
  planId: 'launch' | 'scale';
  planVersion: number;
  providerCustomerId?: string;
  providerSubscriptionId: string;
  scheduledPlanId?: 'launch' | 'scale';
  status: SubscriptionStatus;
}

export abstract class SubscriptionAuthority {
  abstract findSubscription(
    providerSubscriptionId: string,
  ): Promise<SubscriptionAuthoritySnapshot | undefined>;
}

export class StripeSubscriptionAuthority extends SubscriptionAuthority {
  constructor(
    private readonly secretKey: string,
    private readonly planMappings: StripePlanMappings,
    private readonly request: typeof fetch = fetch,
  ) {
    super();
  }

  async findSubscription(providerSubscriptionId: string) {
    if (!/^sub_[A-Za-z0-9_]+$/.test(providerSubscriptionId)) {
      throw new Error('Stripe Subscription ID is invalid.');
    }
    const url = new URL(
      `https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`,
    );
    url.searchParams.append('expand[]', 'schedule');
    const response = await this.request(url.toString(), {
      headers: { authorization: `Bearer ${this.secretKey}` },
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error('Stripe Subscription is unavailable.');

    const subscription: unknown = await response.json();
    if (!isRecord(subscription)) {
      throw new Error('Stripe Subscription response is invalid.');
    }
    const metadata = subscription.metadata;
    const items = subscription.items;
    const firstItem =
      isRecord(items) && Array.isArray(items.data) ? items.data[0] : undefined;
    const price = isRecord(firstItem) ? firstItem.price : undefined;
    const priceId = isRecord(price) ? price.id : undefined;
    const currentPeriodEnd =
      subscription.current_period_end ??
      (isRecord(firstItem) ? firstItem.current_period_end : undefined);
    const nextPriceId = scheduledPriceIdFromStripeSchedule(
      subscription.schedule,
    );
    if (
      subscription.id !== providerSubscriptionId ||
      typeof subscription.customer !== 'string' ||
      !/^cus_[A-Za-z0-9_]+$/.test(subscription.customer) ||
      !isRecord(metadata) ||
      typeof metadata.organizationId !== 'string' ||
      !/^org_[A-Za-z0-9_]+$/.test(metadata.organizationId) ||
      typeof priceId !== 'string' ||
      typeof currentPeriodEnd !== 'number' ||
      !Number.isSafeInteger(currentPeriodEnd) ||
      !isSubscriptionStatus(subscription.status) ||
      typeof subscription.cancel_at_period_end !== 'boolean' ||
      (nextPriceId !== undefined && typeof nextPriceId !== 'string')
    ) {
      throw new Error('Stripe Subscription response is invalid.');
    }

    return {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEndsAt: new Date(currentPeriodEnd * 1_000),
      organizationId: metadata.organizationId,
      planId: planIdForPrice(priceId, this.planMappings),
      planVersion: 1,
      providerCustomerId: subscription.customer,
      providerSubscriptionId,
      ...(nextPriceId && {
        scheduledPlanId: planIdForPrice(nextPriceId, this.planMappings),
      }),
      status: subscription.status,
    };
  }
}

export interface SubscriptionRepairRepository extends BillingProjectionRepository {
  findReplaySubscription(
    input: { organizationId: string; providerSubscriptionId: string },
    planMappings: StripePlanMappings,
  ): Promise<SubscriptionProjection | undefined>;
  rebuildSubscription(
    input: { organizationId: string; providerSubscriptionId: string },
    planMappings: StripePlanMappings,
  ): Promise<SubscriptionProjection | undefined>;
}

export type ReconciliationDifference =
  | 'cancelAtPeriodEnd'
  | 'currentPeriodEndsAt'
  | 'pastDueAt'
  | 'planId'
  | 'planVersion'
  | 'providerCustomerId'
  | 'providerSubscriptionId'
  | 'scheduledPlanId'
  | 'status';

export type AuthorizeBillingOperator = (input: {
  action: 'reconcile' | 'repair';
  credential: string;
  organizationId: string;
}) => Promise<{ operatorId: string } | undefined>;

export interface BillingReplayAuditEvent {
  action: 'billing.subscription.replay-requested';
  actor: { id: string; type: 'operator' };
  occurredAt: Date;
  organizationId: string;
  target: { id: string; type: 'subscription' };
}

export interface SubscriptionReconciliationInput {
  credential: string;
  organizationId: string;
  providerSubscriptionId: string;
}

export type SubscriptionReconciliationStatus =
  | 'authority-organization-mismatch'
  | 'drifted'
  | 'in-sync'
  | 'missing-authority'
  | 'missing-local';

export interface SubscriptionReconciliationResult {
  differences: ReconciliationDifference[];
  organizationId: string;
  providerSubscriptionId: string;
  status: SubscriptionReconciliationStatus;
}

export interface SubscriptionReconciliationOptions {
  audit?: (event: BillingReplayAuditEvent) => Promise<void>;
  authority: SubscriptionAuthority;
  authorize: AuthorizeBillingOperator;
  now?: () => Date;
  planMappings: StripePlanMappings;
  projections: SubscriptionRepairRepository;
}

export class BillingOperatorAuthorizationError extends Error {}

export class SubscriptionReconciliationService {
  private readonly authority: SubscriptionAuthority;
  private readonly authorize: AuthorizeBillingOperator;
  private readonly audit?: (event: BillingReplayAuditEvent) => Promise<void>;
  private readonly now: () => Date;
  private readonly planMappings: StripePlanMappings;
  private readonly projections: SubscriptionRepairRepository;

  constructor(options: SubscriptionReconciliationOptions) {
    this.authority = options.authority;
    this.authorize = options.authorize;
    this.audit = options.audit;
    this.now = options.now ?? (() => new Date());
    this.planMappings = options.planMappings;
    this.projections = options.projections;
  }

  async reconcile(
    input: SubscriptionReconciliationInput,
  ): Promise<SubscriptionReconciliationResult> {
    this.validateScope(input);
    const operator = await this.authorize({
      action: 'reconcile',
      credential: input.credential,
      organizationId: input.organizationId,
    });
    if (!operator) throw new BillingOperatorAuthorizationError();

    return this.compare(input);
  }

  async repair(
    input: SubscriptionReconciliationInput,
  ): Promise<SubscriptionReconciliationResult> {
    this.validateScope(input);
    const operator = await this.authorize({
      action: 'repair',
      credential: input.credential,
      organizationId: input.organizationId,
    });
    if (!operator) throw new BillingOperatorAuthorizationError();

    const before = await this.compare(input);
    if (before.status !== 'drifted' && before.status !== 'missing-local') {
      return before;
    }
    if (!this.audit) {
      throw new Error('Audit Event extension is required for repair.');
    }
    await this.audit({
      action: 'billing.subscription.replay-requested',
      actor: { id: operator.operatorId, type: 'operator' },
      occurredAt: this.now(),
      organizationId: input.organizationId,
      target: { id: input.providerSubscriptionId, type: 'subscription' },
    });
    await this.projections.rebuildSubscription(
      {
        organizationId: input.organizationId,
        providerSubscriptionId: input.providerSubscriptionId,
      },
      this.planMappings,
    );
    return this.compare(input);
  }

  private async compare(
    input: Pick<
      SubscriptionReconciliationInput,
      'organizationId' | 'providerSubscriptionId'
    >,
  ): Promise<SubscriptionReconciliationResult> {
    const authority = await this.authority.findSubscription(
      input.providerSubscriptionId,
    );
    if (!authority) {
      return this.result(input, 'missing-authority');
    }
    if (authority.organizationId !== input.organizationId) {
      return this.result(input, 'authority-organization-mismatch');
    }
    const local = await this.projections.findSubscription(input.organizationId);
    if (!local) return this.result(input, 'missing-local');
    const replay = await this.projections.findReplaySubscription(
      input,
      this.planMappings,
    );

    const differences: ReconciliationDifference[] = [];
    if ((local.cancelAtPeriodEnd ?? false) !== authority.cancelAtPeriodEnd) {
      differences.push('cancelAtPeriodEnd');
    }
    if (
      local.currentPeriodEndsAt.getTime() !==
      authority.currentPeriodEndsAt.getTime()
    ) {
      differences.push('currentPeriodEndsAt');
    }
    if (
      (local.pastDueAt?.getTime() ?? null) !==
      (replay?.pastDueAt?.getTime() ?? null)
    ) {
      differences.push('pastDueAt');
    }
    for (const field of [
      'planId',
      'planVersion',
      'providerCustomerId',
      'providerSubscriptionId',
      'scheduledPlanId',
      'status',
    ] as const) {
      if (local[field] !== authority[field]) differences.push(field);
    }

    return {
      ...this.result(input, differences.length ? 'drifted' : 'in-sync'),
      differences,
    };
  }

  private validateScope(
    input: Pick<
      SubscriptionReconciliationInput,
      'organizationId' | 'providerSubscriptionId'
    >,
  ) {
    if (
      !/^org_[A-Za-z0-9_]+$/.test(input.organizationId) ||
      !/^sub_[A-Za-z0-9_]+$/.test(input.providerSubscriptionId)
    ) {
      throw new Error('Subscription reconciliation scope is invalid.');
    }
  }

  private result(
    input: Pick<
      SubscriptionReconciliationInput,
      'organizationId' | 'providerSubscriptionId'
    >,
    status: SubscriptionReconciliationStatus,
  ): SubscriptionReconciliationResult {
    return {
      differences: [] as ReconciliationDifference[],
      organizationId: input.organizationId,
      providerSubscriptionId: input.providerSubscriptionId,
      status,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
