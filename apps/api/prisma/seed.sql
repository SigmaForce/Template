-- Local-only synthetic projection. It has no matching Clerk identities.
-- `scripts/bootstrap.mjs` rejects non-local database URLs before this runs.
INSERT INTO "organizations" (
  "id", "name", "slug", "locale", "time_zone", "state", "updated_at"
)
VALUES (
  'org_foundation_demo',
  'Foundation Demo',
  'foundation-demo',
  'en-US',
  'UTC',
  'ACTIVE',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "organization_slugs" ("slug", "organization_id")
VALUES ('foundation-demo', 'org_foundation_demo')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "memberships" (
  "id", "organization_id", "user_id", "role", "status", "updated_at"
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'org_foundation_demo',
    'user_foundation_demo_owner',
    'OWNER',
    'ACTIVE',
    CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'org_foundation_demo',
    'user_foundation_demo_suspended',
    'MEMBER',
    'SUSPENDED',
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("organization_id", "user_id") DO NOTHING;

INSERT INTO "invitations" (
  "id", "organization_id", "email_address", "role", "status", "external_id",
  "invited_by_user_id", "expires_at", "updated_at"
)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'org_foundation_demo',
  'foundation+invited@example.test',
  'MEMBER',
  'PENDING',
  'inv_foundation_demo',
  'user_foundation_demo_owner',
  TIMESTAMP '2099-01-01 00:00:00',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
