CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "dedupe_key" VARCHAR(255) NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "kind" VARCHAR(80) NOT NULL,
  "recipient_email" VARCHAR(320) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" VARCHAR(24) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMPTZ(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "notification_attempts" (
  "id" UUID NOT NULL,
  "notification_id" UUID NOT NULL,
  "number" INTEGER NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "error" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE UNIQUE INDEX "notification_attempts_notification_id_number_key" ON "notification_attempts"("notification_id", "number");
CREATE INDEX "notifications_organization_id_created_at_id_idx" ON "notifications"("organization_id", "created_at" DESC, "id" DESC);
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
