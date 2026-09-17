ALTER TABLE "organizations"
ADD COLUMN "billing_contact_email" VARCHAR(320);

CREATE TABLE "organization_slugs" (
    "slug" VARCHAR(48) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_slugs_pkey" PRIMARY KEY ("slug")
);

INSERT INTO "organization_slugs" ("slug", "organization_id")
SELECT "slug", "id" FROM "organizations";

CREATE INDEX "organization_slugs_organization_id_idx"
ON "organization_slugs"("organization_id");

ALTER TABLE "organization_slugs"
ADD CONSTRAINT "organization_slugs_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
