CREATE TABLE "webhook_endpoints" (
  "id" UUID NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "events" TEXT[] NOT NULL,
  "secret" VARCHAR(255) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "webhook_deliveries" (
  "id" VARCHAR(255) NOT NULL,
  "endpoint_id" UUID NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "event_type" VARCHAR(120) NOT NULL,
  "version" VARCHAR(32) NOT NULL,
  "payload" JSONB NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "status" VARCHAR(24) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_attempt_at" TIMESTAMPTZ(3),
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "webhook_delivery_attempts" (
  "id" UUID NOT NULL,
  "delivery_id" VARCHAR(255) NOT NULL,
  "number" INTEGER NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "response_status" INTEGER,
  "error" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_delivery_attempts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webhook_delivery_attempts_delivery_id_number_key" ON "webhook_delivery_attempts"("delivery_id", "number");
CREATE INDEX "webhook_endpoints_organization_id_created_at_id_idx" ON "webhook_endpoints"("organization_id", "created_at" DESC, "id" DESC);
CREATE INDEX "webhook_deliveries_organization_id_created_at_id_idx" ON "webhook_deliveries"("organization_id", "created_at" DESC, "id" DESC);
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "webhook_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
