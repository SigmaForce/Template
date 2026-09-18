CREATE TYPE "OrganizationState" AS ENUM ('ACTIVE', 'READ_ONLY', 'PENDING_DELETION');

ALTER TABLE "organizations"
ADD COLUMN "state" "OrganizationState" NOT NULL DEFAULT 'ACTIVE';
