CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "email_address" VARCHAR(320) NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "external_id" VARCHAR(64) NOT NULL,
    "invited_by_user_id" VARCHAR(64) NOT NULL,
    "accepted_by_user_id" VARCHAR(64),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitations_external_id_key" ON "invitations"("external_id");
CREATE UNIQUE INDEX "invitations_organization_id_email_address_key" ON "invitations"("organization_id", "email_address");
CREATE INDEX "invitations_status_expires_at_idx" ON "invitations"("status", "expires_at");

ALTER TABLE "invitations"
ADD CONSTRAINT "invitations_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
