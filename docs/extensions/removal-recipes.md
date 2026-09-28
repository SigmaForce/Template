# Extension removal recipes

These recipes follow ADR-0007: remove an Extension from a clone by deleting
its complete surface, then run the listed quality gates. Commands are run from
the repository root with `pnpm install` already complete.

## Audit Events

1. Delete `apps/api/src/audit-events/` and its imports/providers in
   `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, and tests.
2. Remove the `AuditEvent` model and its migration, the audit action/target
   entries, and the generated API contract audit schemas.
3. Remove the Organization audit-events route and API-client operation.
4. Remove audit-only consumers (onboarding, notifications, API Keys, Files,
   Webhooks, and billing reconciliation), or replace them with an explicit
   local policy before deleting the module.
5. Run `pnpm --filter @saas/api typecheck`, `pnpm contract:check`, and
   `pnpm test`.

## Files

1. Remove `apps/api/src/files/`, its `files` option in `AppModuleOptions`, the
   Railway storage configuration, and the Files routes/tests.
2. Remove the `File` model and migration, bucket environment/configuration,
   and generated File schemas/routes from `packages/api-client`.
3. Remove `organizationFilesManage` and `organizationFilesRead` only after
   removing every policy and UI reference.
4. Run API typecheck, contract check, startup checks, and the full test suite.

## API Keys

1. Remove `apps/api/src/api-keys/`, its `apiKeys` application option, verifier,
   authentication integration, routes, UI controls, and API-key tests.
2. Remove the `ApiKey` model/migration, API-key permissions and audit actions,
   generated schemas, and any notification intent that announces API-key
   issuance.
3. Remove API-key scopes from authentication and revoke/rotation references.
4. Run API/worker typechecks, contract check, API e2e tests, and smoke tests.

## Webhook Endpoints and Deliveries

1. Remove `apps/api/src/webhooks/`, the webhook option in `AppModuleOptions`,
   the API bootstrap repository/queue, and the worker webhook consumer.
2. Remove `WebhookEndpoint`, `WebhookDelivery`, and attempt models/migrations,
   the `webhook-delivery` tooling queue, and generated contract entries.
3. Remove webhook routes, permissions, audit actions, endpoint UI, and webhook
   e2e/worker tests.
4. Remove notification intents that announce webhook dead letters.
5. Run API and worker typechecks, contract/startup checks, and full tests.

## Operational Notifications

1. Remove `apps/api/src/notifications/`, the notification option in
   `AppModuleOptions`, the worker notification consumer, and its API export.
2. Remove `Notification` and `NotificationAttempt` models/migrations, the
   `notifications` tooling queue, generated audit action/target entries, and
   notification tests.
3. Remove every producer of `NotificationIntent` before deleting its types;
   do not leave security, billing, or integration outcomes calling a missing
   provider.
4. Run API/worker typechecks, contract/startup checks, and full tests.

## Operator and localization extensions

Use the same complete-surface rule: remove the module, bootstrap option,
worker/queue, persistence migration, routes and generated contract, UI, and
tests together. Search with `rg "operators|locale|notification|webhook|api-key|file"`
after each removal and run `pnpm test` before considering the clone clean.

## Isolation certification

Every Organization-owned resource has a negative test before removal is
certified:

| Resource | Negative coverage |
| --- | --- |
| Audit Events | `apps/api/test/app.e2e-spec.ts` cross-Organization audit reads |
| Files | `apps/api/test/files.e2e-spec.ts` cross-Organization list/download/delete |
| API Keys | `apps/api/test/api-keys.e2e-spec.ts` cross-Organization access |
| Webhooks | `apps/api/test/webhooks.e2e-spec.ts` endpoint ownership and delivery replay |
| Notifications | `apps/api/test/notifications.spec.ts` Organization-owned intent payload |

Worker tests use Memory repositories and synthetic providers. They never call
arbitrary public networks or print provider secrets.
