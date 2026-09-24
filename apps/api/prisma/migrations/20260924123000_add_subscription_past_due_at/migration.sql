ALTER TABLE "subscriptions"
ADD COLUMN "past_due_at" TIMESTAMP(3);

UPDATE "subscriptions" AS "subscription"
SET "past_due_at" = COALESCE(
  (
    SELECT MIN("delinquent_event"."provider_created_at")
    FROM "billing_inbox_events" AS "delinquent_event"
    WHERE "delinquent_event"."organization_id" = "subscription"."organization_id"
      AND "delinquent_event"."subscription_status" IN ('past_due', 'unpaid')
      AND "delinquent_event"."provider_created_at" > COALESCE(
        (
          SELECT MAX("recovery_event"."provider_created_at")
          FROM "billing_inbox_events" AS "recovery_event"
          WHERE "recovery_event"."organization_id" = "subscription"."organization_id"
            AND "recovery_event"."subscription_status" IS NOT NULL
            AND "recovery_event"."subscription_status" NOT IN ('past_due', 'unpaid')
            AND "recovery_event"."provider_created_at" <= "subscription"."provider_event_created_at"
        ),
        '-infinity'::timestamp
      )
      AND "delinquent_event"."provider_created_at" <= "subscription"."provider_event_created_at"
  ),
  "subscription"."provider_event_created_at"
)
WHERE "subscription"."status" IN ('past_due', 'unpaid');
