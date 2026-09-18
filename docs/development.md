# Foundation developer journey

This guide takes a new developer from a fresh clone to the real Foundation
flows. It uses only a local PostgreSQL and Redis pair, a Clerk development
instance, and synthetic data. It never imports, copies, or writes production
data.

## Prerequisites

- Node.js 22.18 or newer, with Corepack enabled;
- Docker with Docker Compose;
- a Clerk development instance with Organizations enabled and the custom
  `org:owner` role;
- two synthetic Clerk Users with email addresses that you control for testing.

Install dependencies and configure the local environment:

```sh
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

Replace the Clerk placeholders in `.env` with development keys. Keep
`CLERK_SECRET_KEY` server-only; it is required by the API for Organization
management. `CLERK_AUTHORIZED_PARTIES` must contain the exact local web origin.
Do not use Neon, Railway, staging, or production connection strings in `.env`
while running the bootstrap command.

## Bootstrap and start

```sh
corepack pnpm bootstrap
corepack pnpm dev:apps
```

`bootstrap` starts the local PostgreSQL and Redis containers, applies committed
migrations, and inserts an idempotent synthetic projection. It rejects any
non-local `DATABASE_URL` or `DIRECT_DATABASE_URL` before it starts Docker or
Prisma. The seed creates the `Foundation Demo` Organization, one active
Membership with the Owner Role, one suspended Membership, and one pending
Invitation. Those IDs have no matching Clerk identities, so they are for
database inspection only, not for browser authentication.

The applications run at `http://localhost:3000` (web),
`http://localhost:4000` (API), and `http://localhost:4001` (worker). Use
`corepack pnpm dev` instead when you only need the existing start-everything
shortcut; it does not run the synthetic seed.

## End-to-end Organization journey

Use separate synthetic Users rather than a personal or production identity.

1. Sign in as User A at `http://localhost:3000`. With no Membership, the
   application displays Organization onboarding. Create `Northstar Demo`; A
   receives an active Membership with the Owner Role and it becomes A's Active
   Organization.
2. Sign out. As User B, create a first Organization such as `Harbor Demo`.
   B receives an active Membership with the Owner Role. This provides B a
   second Organization for the switching exercise.
3. Sign back in as A and open the `Northstar Demo` Organization page. Send an
   Invitation to B's synthetic email with the Member role. A pending Invitation
   is not a Membership and does not consume a Seat.
4. Sign in as B. Accept the Invitation during Organization onboarding and let
   the application finish the API sync. B now has a Membership with the Member
   Role in `Northstar Demo` and a Membership with the Owner Role in
   `Harbor Demo`.
5. Use the Active Organization selector in the shell to move between the two
   Organizations. The application navigates to the selected Organization and
   refreshes the server-side context; do not treat a route slug or client state
   as authorization.
6. Sign in as A again. On `Northstar Demo`, open Team Memberships and suspend
   B's Membership. Suspension is reversible, retains history, and prevents B
   from accessing that Organization without deleting B or B's other
   Membership. Restore it to repeat the switch exercise.

The team page also demonstrates the Permission boundary. The current matrix is
defined in `apps/api/src/authorization/permission.ts`: Owners have every
Permission; Admins manage Organization settings and Memberships; Members read
settings and may leave. Change that central matrix and its tests when product
policy changes—do not add checks independently in pages or controllers.

## Boundaries and customization

| Area | Owns | Must not own |
| --- | --- | --- |
| `apps/web` | Next.js rendering, browser interaction, Clerk session use | persistence models or backend authorization rules |
| `apps/api` | NestJS API, domain modules, validation, authorization, PostgreSQL persistence | web-only state or duplicated client contracts |
| `apps/worker` | durable background execution over API-owned modules | a second domain model |
| `packages/ui` | semantic UI components, brand, tokens, accessibility behavior | product authorization or data access |
| `packages/api-client` | generated OpenAPI types and client | handwritten backend models |
| `packages/tooling-config` | shared operational configuration | generic product utilities |

Share only an explicit contract, configuration, or UI component. Do not create
a catch-all `shared`, `common`, or `utils` folder for cross-layer code.

For visual customization, edit `packages/ui/src/brand.ts` for product identity
and `packages/ui/src/styles.css` for primitive and semantic tokens. Keep
components on semantic tokens and follow `packages/ui/README.md` for variants,
accessibility, and Storybook coverage. Keep domain language aligned with
`CONTEXT.md`: Organization, Active Organization, Membership, Invitation, Role,
and Permission have intentional meanings.

The OpenAPI contract is the web/API boundary. Update NestJS DTOs and
decorators, then run `corepack pnpm contract:generate`; never hand-edit the
generated client. Keep a Nest module cohesive instead of moving its services or
persistence models to a generic workspace package.

## Verification and troubleshooting

Run the same local quality gates before sharing a change:

```sh
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:startup
corepack pnpm --filter @saas/api test:e2e
corepack pnpm --filter @saas/api test:db
corepack pnpm storybook:build
corepack pnpm build
```

`TEST_DATABASE_URL` in `.env.example` points at the local PostgreSQL service.
Keep it local: `test:db` reapplies committed migrations and runs the database
integration suite without allowing it to skip.

| Symptom | Resolution |
| --- | --- |
| Bootstrap rejects a database URL | Use the local URLs from `.env.example`; the command intentionally refuses remote databases. |
| Docker cannot start or a port is busy | Start Docker Desktop, then free or change `POSTGRES_PORT` / `REDIS_PORT` in `.env`. |
| Startup reports Clerk configuration errors | Replace the development placeholders, enable Organizations, configure `org:owner`, and include the exact web origin in `CLERK_AUTHORIZED_PARTIES`. |
| Invitation does not appear | Verify the exact synthetic email in Clerk, sign out and back in as that User, then accept from onboarding. |
| Contract check fails | Regenerate from the API with `corepack pnpm contract:generate`; do not edit generated files. |
| A build lacks public web variables | Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`. |

## Not in this Foundation release

Commerce, Extensions, and Public Release are future phases. This repository
does not present billing checkout, third-party extension points, or a public
production release workflow as working features. Add them only when their
respective product and operational requirements are implemented.
