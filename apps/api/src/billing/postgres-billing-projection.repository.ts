import { Pool } from 'pg';
import {
  BillingProjectionRepository,
  nextSubscriptionProjection,
  type BillingInboxRecord,
  type StripePlanMappings,
  type SubscriptionProjection,
} from './subscription-projection.js';
import type { SubscriptionStatus } from './billing.js';

type InboxRow = {
  created_at: Date;
  current_period_ends_at: Date;
  event_id: string;
  organization_id: string;
  price_id: string;
  processed_at: Date | null;
  provider_subscription_id: string;
  subscription_status: SubscriptionStatus;
};

type SubscriptionRow = {
  current_period_ends_at: Date;
  organization_id: string;
  plan_id: 'launch' | 'scale';
  plan_version: number;
  provider_event_created_at: Date;
  provider_subscription_id: string;
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
      const eventResult = await client.query<InboxRow>(
        `SELECT event_id, organization_id, provider_subscription_id, price_id,
                subscription_status, current_period_ends_at, provider_created_at AS created_at,
                processed_at
           FROM billing_inbox_events
          WHERE event_id = $1
          FOR UPDATE`,
        [eventId],
      );
      const row = eventResult.rows[0];
      if (!row) throw new Error('Billing inbox event is unavailable.');
      if (row.processed_at) {
        await client.query('COMMIT');
        return {
          organizationId: row.organization_id,
          outcome: 'already-processed' as const,
        };
      }

      await client.query(
        'SELECT id FROM organizations WHERE id = $1 FOR UPDATE',
        [row.organization_id],
      );
      const currentResult = await client.query<SubscriptionRow>(
        `SELECT organization_id, provider_subscription_id, plan_id, plan_version,
                status, current_period_ends_at, provider_event_created_at
           FROM subscriptions WHERE organization_id = $1`,
        [row.organization_id],
      );
      const current = currentResult.rows[0]
        ? this.toSubscription(currentResult.rows[0])
        : undefined;
      const next = nextSubscriptionProjection(
        this.toEvent(row),
        current,
        planMappings,
      );

      if (next) {
        await client.query(
          `INSERT INTO subscriptions
             (organization_id, provider_subscription_id, plan_id, plan_version, status,
              current_period_ends_at, provider_event_created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (organization_id) DO UPDATE SET
             provider_subscription_id = EXCLUDED.provider_subscription_id,
             plan_id = EXCLUDED.plan_id,
             plan_version = EXCLUDED.plan_version,
             status = EXCLUDED.status,
             current_period_ends_at = EXCLUDED.current_period_ends_at,
             provider_event_created_at = EXCLUDED.provider_event_created_at,
             updated_at = CURRENT_TIMESTAMP`,
          [
            next.organizationId,
            next.providerSubscriptionId,
            next.planId,
            next.planVersion,
            next.status,
            next.currentPeriodEndsAt,
            next.providerEventCreatedAt,
          ],
        );
      }
      await client.query(
        'UPDATE billing_inbox_events SET processed_at = CURRENT_TIMESTAMP WHERE event_id = $1',
        [eventId],
      );
      await client.query('COMMIT');
      return {
        organizationId: row.organization_id,
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
      `SELECT organization_id, provider_subscription_id, plan_id, plan_version,
              status, current_period_ends_at, provider_event_created_at
         FROM subscriptions WHERE organization_id = $1`,
      [organizationId],
    );
    return result.rows[0] ? this.toSubscription(result.rows[0]) : undefined;
  }

  async close() {
    await this.pool.end();
  }

  private toEvent(row: InboxRow): BillingInboxRecord {
    return {
      createdAt: row.created_at,
      currentPeriodEndsAt: row.current_period_ends_at,
      id: row.event_id,
      organizationId: row.organization_id,
      priceId: row.price_id,
      providerSubscriptionId: row.provider_subscription_id,
      status: row.subscription_status,
    };
  }

  private toSubscription(row: SubscriptionRow): SubscriptionProjection {
    return {
      currentPeriodEndsAt: row.current_period_ends_at,
      organizationId: row.organization_id,
      planId: row.plan_id,
      planVersion: row.plan_version,
      providerEventCreatedAt: row.provider_event_created_at,
      providerSubscriptionId: row.provider_subscription_id,
      status: row.status,
    };
  }
}
