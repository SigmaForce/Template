CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "object_key" VARCHAR(255) NOT NULL,
    "created_by_user_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "files_object_key_key" ON "files"("object_key");
CREATE INDEX "files_organization_id_created_at_id_idx" ON "files"("organization_id", "created_at" DESC, "id" DESC);

ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
