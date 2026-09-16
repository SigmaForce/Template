# Next Nest SaaS Starter

Production-minded foundation for B2B SaaS products built with Next.js, NestJS, PostgreSQL, and Redis.

## Requirements

- Node.js 22.18 or newer
- Corepack with pnpm 11.9.0
- Docker with Docker Compose

## Start locally

Create the local environment file once:

```powershell
Copy-Item .env.example .env
```

Install dependencies and start infrastructure plus every application:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The web application runs at `http://localhost:3000`, the API at `http://localhost:4000`, and the worker health endpoint at `http://localhost:4001/health`.

The versioned API contract is available as interactive documentation at `http://localhost:4000/v1/docs` and as OpenAPI JSON at `http://localhost:4000/v1/openapi.json`. The generated TypeScript client lives in `packages/api-client`; regenerate and verify it with:

```sh
corepack pnpm contract:generate
corepack pnpm contract:check
```

Never edit `openapi.json` or `src/generated/schema.ts` directly. Change the NestJS DTOs and decorators, then regenerate both artifacts.

If configuration is absent or invalid, startup stops and reports each value that needs attention.

## Authentication

Create a Clerk development instance, copy `.env.example` to `.env`, and replace
the Clerk placeholders with the instance's publishable and secret keys. Keep
`CLERK_SECRET_KEY` server-only. `CLERK_AUTHORIZED_PARTIES` is a comma-separated
allowlist of exact web origins whose session tokens the API accepts; configure
the deployed web origin separately for each environment. `CLERK_JWT_KEY` may
supplement the required secret key when networkless verification with Clerk's
PEM public key is preferred; the API still needs `CLERK_SECRET_KEY` to manage
Organizations.

In the Clerk Dashboard, enable Organizations and add the custom Organization
Role `org:owner`. The first-Organization flow creates the Organization in
Clerk, changes the creator's Clerk Membership to that Owner Role, and persists
the Organization plus its one active Owner Membership atomically in PostgreSQL.

The `/sign-in` and `/sign-up` routes use the configured development instance.
Every application page under the protected shell performs a server-side session
check. Server Components obtain a Clerk session token and call NestJS directly;
NestJS derives the User only from the verified token and exposes it at
`GET /v1/auth/me`.

For the authenticated Playwright journey, create a synthetic Clerk User whose
email contains `+clerk_test`, then set `E2E_CLERK_USER_EMAIL` in `.env`. The
official Clerk testing helper signs that User in through the development
instance, creates its first Organization when necessary, verifies the protected
shell and API identity, and signs out. Optionally set
`E2E_CLERK_ORGANIZATION_SLUG` to choose its deterministic slug. Do not commit
the test User or Clerk credentials.

## Database

Prisma owns the PostgreSQL schema under `apps/api/prisma`. `DATABASE_URL` is
the pooled Neon connection used by the running API. `DIRECT_DATABASE_URL` is
the direct Neon connection reserved for migrations; configure both as Railway
secrets and never expose either to the browser.

Generate the client and apply committed migrations with:

```sh
corepack pnpm --filter @saas/api db:generate
corepack pnpm --filter @saas/api db:migrate:deploy
```

For local schema work, start PostgreSQL with `corepack pnpm dev:infra` and run
`corepack pnpm --filter @saas/api db:migrate:dev`. Production and shared
environments should only run `db:migrate:deploy` as a release step, using
`DIRECT_DATABASE_URL`.

## Operations

Liveness only confirms that a process can answer requests. Readiness also
checks the dependencies required for that process to serve useful traffic:

| Process | Liveness      | Readiness    | Critical dependencies | Optional integrations  |
| ------- | ------------- | ------------ | --------------------- | ---------------------- |
| Web     | `/api/health` | `/api/ready` | API                   | PostHog, Sentry        |
| API     | `/v1/health`  | `/v1/ready`  | PostgreSQL            | Redis, PostHog, Sentry |
| Worker  | `/health`     | `/ready`     | PostgreSQL, Redis     | PostHog, Sentry        |

Readiness returns `ready`, `degraded`, or `unready`. An unavailable critical
dependency returns HTTP 503; an unavailable or misconfigured optional
integration returns `degraded` with HTTP 200. Optional integrations left blank
are `disabled`, initialize no telemetry client, and do not affect startup or
requests. PostgreSQL and Redis probes authenticate and execute `SELECT 1` and
`PING`, respectively, so an open port alone is not considered ready.

Every request receives an `x-correlation-id`. A caller-provided identifier is
preserved only when it contains safe ASCII characters and is at most 128
characters; otherwise a UUID is generated. Next.js propagates the identifier to
NestJS and every process returns it in the response.

Application logs are one JSON object per line and include the service,
environment, request identity, result, and duration where applicable. Request
queries, headers, and bodies are not logged. Authorization, cookies, tokens,
signatures, secret-bearing keys, payloads, email addresses, phone numbers, and
other known PII fields are redacted by the shared operational logger.

`APP_ENV` accepts `development`, `test`, `staging`, or `production`; `LOG_LEVEL`
accepts `debug`, `info`, `warn`, or `error`. The typed parsers in
`scripts/environment-core.mjs` validate each independently deployed process
before it starts accepting traffic. `corepack pnpm env:check` validates the
complete local environment and reports optional telemetry only by state, never
by configured value.

## Verification

```sh
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @saas/ui test:storybook
corepack pnpm dev:infra
corepack pnpm test:smoke
corepack pnpm build
```

Architecture and domain decisions live in `CONTEXT.md` and `docs/adr/`.

## Design system

The owned component layer lives in `packages/ui`. Change the example brand once
in `packages/ui/src/brand.ts`; its name, mark, tagline and metadata propagate
through the application shell. Primitive and semantic token responsibilities,
theme customization and the fixed Base UI layer are documented in
`packages/ui/README.md`.

Run the component catalog with `corepack pnpm storybook` and verify its static
build with `corepack pnpm storybook:build`. Forms, overlays and feedback use a
typed CVA facade over fixed Base UI primitives; their unit and browser story
tests run as part of `corepack pnpm test`.
