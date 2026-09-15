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

## Operations

Liveness only confirms that a process can answer requests. Readiness also
checks the dependencies required for that process to serve useful traffic:

| Process | Liveness | Readiness | Critical dependencies | Optional integrations |
| --- | --- | --- | --- | --- |
| Web | `/api/health` | `/api/ready` | API | PostHog, Sentry |
| API | `/v1/health` | `/v1/ready` | PostgreSQL | Redis, PostHog, Sentry |
| Worker | `/health` | `/ready` | PostgreSQL, Redis | PostHog, Sentry |

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
build with `corepack pnpm storybook:build`.
