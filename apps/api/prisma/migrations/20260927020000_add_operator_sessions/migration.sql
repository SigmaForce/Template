CREATE TABLE "operator_sessions" (
  "id" VARCHAR(128) NOT NULL,
  "operator_id" VARCHAR(64) NOT NULL,
  "permissions" TEXT[] NOT NULL,
  "organization_ids" TEXT[] NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),

  CONSTRAINT "operator_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operator_sessions_operator_id_expires_at_idx"
  ON "operator_sessions"("operator_id", "expires_at");
