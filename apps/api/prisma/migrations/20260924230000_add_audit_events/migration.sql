CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "actor_type" VARCHAR(16) NOT NULL,
    "actor_id" VARCHAR(64) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(64) NOT NULL,
    "target_id" VARCHAR(255) NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_events_actor_type_check" CHECK ("actor_type" IN ('operator', 'user')),
    CONSTRAINT "audit_events_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT
);

CREATE INDEX "audit_events_organization_id_occurred_at_id_idx"
ON "audit_events"("organization_id", "occurred_at" DESC, "id" DESC);

CREATE FUNCTION prevent_audit_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit Events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_events_immutable"
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
