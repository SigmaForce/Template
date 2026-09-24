ALTER TABLE "billing_inbox_events"
ADD COLUMN "provider_customer_id" VARCHAR(255),
ADD COLUMN "scheduled_price_id" VARCHAR(255),
ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "price_id" DROP NOT NULL,
ALTER COLUMN "subscription_status" DROP NOT NULL,
ALTER COLUMN "current_period_ends_at" DROP NOT NULL;

ALTER TABLE "subscriptions"
ADD COLUMN "provider_customer_id" VARCHAR(255),
ADD COLUMN "scheduled_plan_id" VARCHAR(32),
ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;
