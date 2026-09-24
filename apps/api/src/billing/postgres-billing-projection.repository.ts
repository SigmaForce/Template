import { Pool, type PoolClient } from 'pg';
import {
  BillingProjectionRepository,
  nextSubscriptionProjection,
  type BillingInboxRecord,
  type StripePlanMappings,
  type SubscriptionProjection,
} from './subscription-projection.js';
import type { SubscriptionStatus } from './billing.js';
import type { BillingInboxEvent } from './billing.js';

type InboxRow = {
  created_at: Date;
  cancel_at_period_end: boolean;
  current_period_ends_at: Date | null;
  event_id: string;
  organization_id: string | null;
  price_id: string | null;
  processed_at: Date | null;
  provider_customer_id: string | null;
  provider_subscription_id: string;
  scheduled_price_id: string | null;
  subscription_status: SubscriptionStatus | null;
  type: BillingInboxEvent['type'];
};

type SubscriptionRow = {
  cancel_at_period_end: boolean;
  current_period_ends_at: Date;
  organization_id: string;
  past_due_at: Date | null;
  plan_id: 'launch' | 'scale';
  plan_version: number;
  provider_event_created_at: Date;
  provider_schedule_event_created_at: Date | null;
  provider_customer_id: string | null;
  provider_subscription_id: string;
  scheduled_plan_id: 'launch' | 'scale' | null;
  status: SubscriptionStatus;
};

export class PostgresBillingProjectionRepository extends BillingProjectionRepository {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString });
  }

  async project(eventId: string, planMappings: StripePlanMappings) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let row = await this.findInboxEvent(client, eventId);
      if (!row) throw new Error('Billing inbox event is unavailable.');
      if (row.processed_at && row.organization_id) {
        await client.query('COMMIT');
        return {
          organizationId: row.organization_id,
          outcome: 'already-processed' as const,
        };
      }

      let organizationId = row.organization_id;
      if (!organizationId) {
        const owner = await client.query<{ organization_id: string }>(
          `SELECT organization_id FROM subscriptions
            WHERE provider_subscription_id = $1`,
          [row.provider_subscription_id],
        );
        organizationId = owner.rows[0]?.organization_id ?? null;
        if (!organizationId) {
          throw new Error('Stripe event Subscription is unavailable.');
        }
      }

      await client.query(
        'SELECT id FROM organizations WHERE id = $1 FOR UPDATE',
        [organizationId],
      );
      row = await this.findInboxEvent(client, eventId, true);
      if (!row) throw new Error('Billing inbox event is unavailable.');
      if (row.organization_id && row.organization_id !== organizationId) {
        throw new Error('Stripe event Organization changed during projection.');
      }
      if (row.processed_at) {
        await client.query('COMMIT');
        return {
          organizationId,
          outcome: 'already-processed' as const,
        };
      }
      if (!row.organization_id) {
        await client.query(
          `UPDATE billing_inbox_events SET organization_id = $1
            WHERE event_id = $2`,
          [organizationId, eventId],
        );
      }
      const currentResult = await client.query<SubscriptionRow>(
        `SELECT organization_id, provider_subscription_id, provider_customer_id,
                plan_id, plan_version, scheduled_plan_id, status,
                cancel_at_period_end, current_period_ends_at,
                past_due_at, provider_event_created_at,
                provider_schedule_event_created_at
           FROM subscriptions WHERE organization_id = $1`,
        [organizationId],
      );
      const current = currentResult.rows[0]
        ? this.toSubscription(currentResult.rows[0])
        : undefined;
      const next = nextSubscriptionProjection(
        this.toEvent(row, organizationId),
        current,
        planMappings,
      );

      if (next) {
        await this.saveSubscription(client, next);
      }
      await client.query(
        'UPDATE billing_inbox_events SET processed_at = CURRENT_TIMESTAMP WHERE event_id = $1',
        [eventId],
      );
      await client.query('COMMIT');
      return {
        organizationId,
        outcome: next ? ('projected' as const) : ('ignored-delayed' as const),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findSubscription(organizationId: string) {
    const result = await this.pool.query<SubscriptionRow>(
      `SELECT organization_id, provider_subscription_id, provider_customer_id,
              plan_id, plan_version, scheduled_plan_id, status,
              cancel_at_period_end, current_period_ends_at,
              past_due_at, provider_event_created_at,
              provider_schedule_event_created_at
         FROM subscriptions WHERE organization_id = $1`,
      [organizationId],
    );
    return result.rows[0] ? this.toSubscription(result.rows[0]) : undefined;
  }

  async findReplaySubscription(
    input: { organizationId: string; providerSubscriptionId: string },
    planMappings: StripePlanMappings,
  ) {
    return this.replaySubscription(this.pool, input, planMappings);
  }

  async rebuildSubscription(
    input: { organizationId: string; providerSubscriptionId: string },
    planMappings: StripePlanMappings,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT id FROM organizations WHERE id = $1 FOR UPDATE',
        [input.organizationId],
      );
      await client.query(
        `UPDATE billing_inbox_events AS schedule
            SET organization_id = $1
          WHERE schedule.organization_id IS NULL
            AND schedule.provider_subscription_id = $2
            AND schedule.type IN ('subscription_schedule.created', 'subscription_schedule.updated')
            AND EXISTS (
              SELECT 1 FROM billing_inbox_events AS subscription
               WHERE subscription.provider_subscription_id = schedule.provider_subscription_id
                 AND subscription.organization_id = $1
                 AND subscription.type IN (
                   'customer.subscription.created',
                   'customer.subscription.deleted',
                   'customer.subscription.updated'
                 )
            )`,
        [input.organizationId, input.providerSubscriptionId],
      );
      const rebuilt = await this.replaySubscription(
        client,
        input,
        planMappings,
        true,
      );
      if (!rebuilt) {
        throw new Error('Subscription replay has no scoped durable events.');
      }
      await this.saveSubscription(client, rebuilt);
      await client.query('COMMIT');
      return rebuilt;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }

  private async findInboxEvent(
    client: PoolClient,
    eventId: string,
    lock = false,
  ) {
    const result = await client.query<InboxRow>(
      `SELECT event_id, organization_id, type, provider_subscription_id,
              provider_customer_id, price_id, scheduled_price_id,
              subscription_status, cancel_at_period_end, current_period_ends_at,
              provider_created_at AS created_at, processed_at
         FROM billing_inbox_events
        WHERE event_id = $1${lock ? '\n        FOR UPDATE' : ''}`,
      [eventId],
    );
    return result.rows[0];
  }

  private toEvent(
    row: InboxRow,
    organizationId: string,
  ): BillingInboxRecord & { organizationId: string } {
    return {
      cancelAtPeriodEnd: row.cancel_at_period_end,
      createdAt: row.created_at,
      ...(row.current_period_ends_at && {
        currentPeriodEndsAt: row.current_period_ends_at,
      }),
      id: row.event_id,
      organizationId,
      ...(row.price_id && { priceId: row.price_id }),
      ...(row.provider_customer_id && {
        providerCustomerId: row.provider_customer_id,
      }),
      providerSubscriptionId: row.provider_subscription_id,
      ...(row.scheduled_price_id && {
        scheduledPriceId: row.scheduled_price_id,
      }),
      ...(row.subscription_status && { status: row.subscription_status }),
      type: row.type,
    };
  }

  private async saveSubscription(
    client: PoolClient,
    subscription: SubscriptionProjection,
  ) {
    await client.query(
      `INSERT INTO subscriptions
         (organization_id, provider_subscription_id, provider_customer_id,
          plan_id, plan_version, scheduled_plan_id, status, cancel_at_period_end,
          current_period_ends_at, provider_event_created_at,
          provider_schedule_event_created_at, past_due_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       ON CONFLICT (organization_id) DO UPDATE SET
         provider_subscription_id = EXCLUDED.provider_subscription_id,
         provider_customer_id = EXCLUDED.provider_customer_id,
         plan_id = EXCLUDED.plan_id,
         plan_version = EXCLUDED.plan_version,
         scheduled_plan_id = EXCLUDED.scheduled_plan_id,
         status = EXCLUDED.status,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         current_period_ends_at = EXCLUDED.current_period_ends_at,
         provider_event_created_at = EXCLUDED.provider_event_created_at,
         provider_schedule_event_created_at = EXCLUDED.provider_schedule_event_created_at,
         past_due_at = EXCLUDED.past_due_at,
         updated_at = CURRENT_TIMESTAMP`,
      [
        subscription.organizationId,
        subscription.providerSubscriptionId,
        subscription.providerCustomerId ?? null,
        subscription.planId,
        subscription.planVersion,
        subscription.scheduledPlanId ?? null,
        subscription.status,
        subscription.cancelAtPeriodEnd ?? false,
        subscription.currentPeriodEndsAt,
        subscription.providerEventCreatedAt,
        subscription.providerScheduleEventCreatedAt ?? null,
        subscription.pastDueAt ?? null,
      ],
    );
  }

  private async replaySubscription(
    queryable: Pick<PoolClient, 'query'>,
    input: { organizationId: string; providerSubscriptionId: string },
    planMappings: StripePlanMappings,
    lock = false,
  ) {
    const events = await queryable.query<InboxRow>(
      `SELECT event_id, organization_id, type, provider_subscription_id,
              provider_customer_id, price_id, scheduled_price_id,
              subscription_status, cancel_at_period_end, current_period_ends_at,
              provider_created_at AS created_at, processed_at
         FROM billing_inbox_events AS event
        WHERE provider_subscription_id = $2
          AND (
            organization_id = $1
            OR (
              organization_id IS NULL
              AND type IN ('subscription_schedule.created', 'subscription_schedule.updated')
              AND EXISTS (
                SELECT 1 FROM billing_inbox_events AS subscription
                 WHERE subscription.provider_subscription_id = event.provider_subscription_id
                   AND subscription.organization_id = $1
                   AND subscription.type IN (
                     'customer.subscription.created',
                     'customer.subscription.deleted',
                     'customer.subscription.updated'
                   )
              )
            )
          )
        ORDER BY provider_created_at, event_id${lock ? '\n        FOR UPDATE' : ''}`,
      [input.organizationId, input.providerSubscriptionId],
    );
    if (!events.rowCount) return undefined;

    let rebuilt: SubscriptionProjection | undefined;
    const ordered = [
      ...events.rows.filter(
        (event) => !event.type.startsWith('subscription_schedule.'),
      ),
      ...events.rows.filter((event) =>
        event.type.startsWith('subscription_schedule.'),
      ),
    ];
    for (const event of ordered) {
      rebuilt =
        nextSubscriptionProjection(
          this.toEvent(event, input.organizationId),
          rebuilt,
          planMappings,
        ) ?? rebuilt;
    }
    if (!rebuilt) {
      throw new Error('Subscription replay produced no projection.');
    }
    return rebuilt;
  }

  private toSubscription(row: SubscriptionRow): SubscriptionProjection {
    return {
      cancelAtPeriodEnd: row.cancel_at_period_end,
      currentPeriodEndsAt: row.current_period_ends_at,
      organizationId: row.organization_id,
      ...(row.past_due_at && { pastDueAt: row.past_due_at }),
      planId: row.plan_id,
      planVersion: row.plan_version,
      providerEventCreatedAt: row.provider_event_created_at,
      ...(row.provider_schedule_event_created_at && {
        providerScheduleEventCreatedAt: row.provider_schedule_event_created_at,
      }),
      ...(row.provider_customer_id && {
        providerCustomerId: row.provider_customer_id,
      }),
      providerSubscriptionId: row.provider_subscription_id,
      ...(row.scheduled_plan_id && {
        scheduledPlanId: row.scheduled_plan_id,
      }),
      status: row.status,
    };
  }
}
