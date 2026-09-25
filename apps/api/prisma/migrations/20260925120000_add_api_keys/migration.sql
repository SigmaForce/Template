CREATE TABLE "api_keys" (
  "id" UUID NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "secret_hash" CHAR(64) NOT NULL,
  "created_by_user_id" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),

  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_keys_organization_id_created_at_id_idx"
  ON "api_keys"("organization_id", "created_at" DESC, "id" DESC);

ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
