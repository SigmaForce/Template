CREATE TABLE "billing_inbox_events" (
    "event_id" VARCHAR(255) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "provider_subscription_id" VARCHAR(255) NOT NULL,
    "price_id" VARCHAR(255) NOT NULL,
    "subscription_status" VARCHAR(32) NOT NULL,
    "current_period_ends_at" TIMESTAMP(3) NOT NULL,
    "provider_created_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "billing_inbox_events_pkey" PRIMARY KEY ("event_id")
);

CREATE TABLE "subscriptions" (
    "organization_id" VARCHAR(64) NOT NULL,
    "provider_subscription_id" VARCHAR(255) NOT NULL,
    "plan_id" VARCHAR(32) NOT NULL,
    "plan_version" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "current_period_ends_at" TIMESTAMP(3) NOT NULL,
    "provider_event_created_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("organization_id")
);

CREATE INDEX "billing_inbox_events_organization_id_provider_created_at_idx"
ON "billing_inbox_events"("organization_id", "provider_created_at");

CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key"
ON "subscriptions"("provider_subscription_id");

ALTER TABLE "billing_inbox_events"
ADD CONSTRAINT "billing_inbox_events_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
ADD CONSTRAINT "subscriptions_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
