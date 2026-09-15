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

If configuration is absent or invalid, startup stops and reports each value that needs attention.

## Verification

```sh
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:smoke
corepack pnpm build
```

Architecture and domain decisions live in `CONTEXT.md` and `docs/adr/`.
