# Foundation Specification

Status: ready-for-agent

## Problem Statement

Building each commercial B2B SaaS product from an empty repository repeatedly consumes time on the same foundational concerns: repository structure, authentication, Organization isolation, authorization, API contracts, accessible interface primitives, local development, testing, and continuous integration. Reimplementing these concerns for every product encourages inconsistent terminology, duplicated security decisions, shallow tests, and unsafe shortcuts around Active Organization scoping. The maintainer needs a public, cloneable foundation that is production-minded while remaining easy to rebrand, extend, and simplify for an individual product.

## Solution

Create the Foundation phase of an MIT-licensed B2B SaaS starter: a pnpm and Turborepo monorepo containing a Next.js web application, a NestJS modular-monolith API, a NestJS worker boundary, and narrowly scoped shared packages for the design system, generated API contracts, and tooling configuration. The Foundation provides Clerk authentication, Organization onboarding and navigation, Membership and Role management, centralized Permission enforcement, shared-schema PostgreSQL isolation through Neon-compatible Prisma access, a versioned REST contract, an owned and accessible Tailwind design system, deterministic local setup, and automated quality gates.

The resulting slice must let a new maintainer clone the project, configure development credentials, start the system, authenticate, create or join an Organization, switch the Active Organization, manage Memberships according to Role, and observe that cross-Organization access is rejected. It establishes the seams on which later Commerce, Extensions, and Public Release work can build without including those later capabilities prematurely.

## User Stories

1. As a template adopter, I want to clone one repository and start all required Foundation services through a documented command, so that I can begin a product without reconstructing its architecture.
2. As a template adopter, I want missing or invalid environment configuration to fail with actionable messages, so that a partially configured deployment cannot appear healthy.
3. As a contributor, I want PostgreSQL and Redis available through a repeatable local setup, so that I do not need paid infrastructure to work on the Foundation.
4. As a contributor, I want synthetic seed data that never contains production information, so that local and preview testing is safe and repeatable.
5. As a maintainer, I want web, API, and worker processes to expose distinguishable health and readiness states, so that infrastructure can identify failure and degradation correctly.
6. As a visitor, I want a responsive public shell with clear authentication entry points, so that I can understand and enter the example product.
7. As a product designer, I want semantic design tokens and replaceable brand values, so that I can rebrand a clone without rewriting components.
8. As a User, I want complete light and dark themes, so that I can use the product in my preferred visual mode.
9. As a keyboard or assistive-technology user, I want accessible controls, navigation, overlays, forms, and feedback, so that the product does not exclude me.
10. As a product developer, I want reusable application patterns for loading, empty, error, forbidden, and Read-only Organization states, so that every feature communicates state consistently.
11. As a product developer, I want reusable responsive application navigation and layout primitives, so that new product areas fit a coherent shell.
12. As a design-system contributor, I want executable stories for component variants and edge states, so that visual customization remains reviewable.
13. As a visitor, I want to authenticate using the configured Clerk development instance, so that the application never handles my password or session implementation.
14. As an authenticated User, I want the API to recognize my verified Clerk identity, so that protected operations cannot trust identity supplied in a request body.
15. As an authenticated User without an Invitation, I want to create an Organization during onboarding, so that I can begin using the product as its Owner.
16. As an invited User, I want to accept an Invitation, so that a Membership is created in the intended Organization.
17. As a User in multiple Organizations, I want to select an Active Organization, so that navigation and data are scoped to the business I am currently working in.
18. As a User in multiple browser tabs, I want each request to carry the correct Active Organization context, so that a tab cannot accidentally operate on another Organization.
19. As a User, I want Organization URLs to use a readable slug, so that links are understandable and shareable with other Memberships.
20. As a User following an outdated Organization slug, I want a safe redirect or reserved-slug outcome, so that renamed Organizations do not create ambiguous links.
21. As an Owner, I want to edit my Organization's supported profile settings, so that its identity and regional defaults remain accurate.
22. As an Owner, I want to invite Users and manage every Membership, so that I can administer participation in my Organization.
23. As an Admin, I want to manage non-Owner Memberships, so that routine administration does not require the Owner.
24. As an Admin, I want attempts to promote, suspend, or remove an Owner to be rejected, so that ownership remains protected.
25. As an Owner, I want to promote another Membership to Owner, so that ownership can be transferred safely.
26. As the last Owner, I want attempts to leave or lose ownership to be rejected, so that the Organization cannot become ownerless.
27. As an authorized administrator, I want to suspend and restore a Membership without deleting its history, so that access can be revoked reversibly.
28. As a suspended User, I want Organization access to be denied consistently in web and API flows, so that suspension is an actual security boundary.
29. As a Member, I want access to ordinary product surfaces without administrative controls, so that my Role grants only intended Permissions.
30. As an Owner, I want billing, ownership, and Organization deletion Permissions reserved to Owners, so that high-impact actions have a conservative default policy even before those later modules exist.
31. As a product developer, I want Permissions declared centrally in code, so that features check business actions rather than scattered Role names.
32. As a product developer, I want every protected operation to evaluate identity, Active Organization, active Membership, Organization state, Capability, Permission, and resource invariants in a consistent order, so that authorization remains explainable.
33. As a security reviewer, I want every Organization-owned database record to require Organization scoping, so that missing tenant boundaries are difficult to introduce.
34. As a security reviewer, I want automated attempts to read, change, and enumerate another Organization's resources to fail, so that shared-schema isolation is demonstrated rather than assumed.
35. As an API consumer, I want a stable `/v1` REST contract, so that integrations have an explicit compatibility boundary.
36. As an API consumer, I want failures represented as RFC 9457 Problem Details, so that errors can be handled consistently without parsing internal messages.
37. As an API consumer, I want list endpoints to use opaque cursor pagination, so that pagination remains stable as records change.
38. As a frontend developer, I want a generated TypeScript client derived from the NestJS OpenAPI document, so that web calls match the API contract without sharing backend models.
39. As a frontend developer, I want Server Components, Client Components, and Server Actions to call one authoritative NestJS API, so that domain behavior is not duplicated in a Next.js BFF.
40. As a User switching Organizations, I want authenticated caches and client state invalidated or partitioned correctly, so that data from the previous Organization never appears in the new context.
41. As a security reviewer, I want strict input validation, explicit CORS, secure headers, payload limits, and layered rate limiting, so that common API abuse has a documented baseline defense.
42. As an operator, I want public errors to exclude stack traces, tokens, cookies, signatures, and private details, so that diagnostics do not expose secrets.
43. As an operator, I want structured logs with request correlation and redaction, so that a request can be traced across web and API without recording sensitive values.
44. As a template adopter, I want PostHog and Sentry to remain disabled when unconfigured, so that the public template never sends maintainer telemetry or blocks local work.
45. As a contributor, I want lint, formatting, type checking, unit tests, integration tests, component tests, builds, and critical end-to-end tests automated, so that every accepted change preserves the Foundation.
46. As a contributor, I want OpenAPI and the generated client checked for drift, so that stale contract artifacts cannot merge.
47. As a contributor, I want dependency, code, workflow, and secret scanning configured with minimal automation permissions, so that the public repository has a defensible supply-chain baseline.
48. As a maintainer, I want database changes to run once per environment through a direct connection and an expand-contract discipline, so that a rolling application deployment does not break against its schema.
49. As a maintainer, I want the Foundation's highest-level Playwright journey to cover authentication, Organization onboarding, switching, Permissions, and isolation, so that the central promise is verified as one user-observable path.
50. As a template adopter, I want architectural and removal guidance that uses the project's canonical domain vocabulary, so that a clone can evolve without erasing its security boundaries.

## Implementation Decisions

- The repository is a pnpm and Turborepo monorepo with separate Next.js web, NestJS API, and NestJS worker applications. Shared workspaces are limited to the owned UI layer, generated API contracts, and tooling configuration.
- The NestJS API is a modular monolith. Organization, Authorization, and supporting Foundation concerns have explicit module boundaries; persistence models and business services never move into a generic shared package.
- PostgreSQL is accessed through Prisma. Runtime services use a pooled connection compatible with Neon, while a single migration job uses the direct connection and `prisma migrate deploy`.
- Foundation migrations follow expand-contract. Application rollback does not automatically reverse the database schema.
- Redis and the worker boundary are bootstrapped for later durable work, but Commerce and Extension jobs are not implemented in this phase.
- Clerk is authoritative for User identity, Organization Memberships, and Role assignments. NestJS encapsulates Clerk verification behind a global authentication boundary and accepts identity and Active Organization only from a verified token.
- Application code owns the Permission vocabulary and authorization policies. The initial Role matrix is Owner, Admin, and Member; Owner exclusively receives billing, ownership, and Organization deletion Permissions.
- The authorization pipeline evaluates identity, Active Organization, active Membership, Organization state, Plan Capability, Role Permission, and resource invariants in that order. Foundation may use placeholder always-enabled Capabilities until the versioned Plan catalog arrives in Commerce, but the seam remains explicit.
- Organization-owned data uses a shared PostgreSQL schema with mandatory `organization_id` scoping, compound uniqueness where relevant, and centralized request context. PostgreSQL RLS and database-per-Organization designs are excluded from the initial Foundation.
- Organization settings include an immutable ID, mutable unique name and slug, billing contact, locale, and timezone. Logo storage is deferred to the Files extension. Old slugs are reserved or redirected without becoming authorization evidence.
- Membership Suspension is reversible, preserves history, denies access, and does not consume a future Seat. A last Owner cannot leave or be demoted. Admin cannot manage Owner Memberships.
- Next.js uses the App Router. Server Components perform initial reads against NestJS, interactive Client Components use a verified Bearer token, and Server Actions may adapt simple forms while reusing the NestJS authority. Route Handlers do not duplicate domain rules.
- Authenticated responses are uncached by default. Any opt-in cache key contains the relevant Organization, User, filters, and authorization dimensions. Switching the Active Organization invalidates or partitions web state.
- REST uses a `/v1` prefix. NestJS DTOs and validation generate OpenAPI with stable operation identifiers. `openapi-typescript` and `openapi-fetch` produce the default web client, and CI detects spec/client drift.
- Public errors use RFC 9457 Problem Details with stable machine-readable types, safe details, correlation identity, and structured validation errors.
- Cursor pagination uses a stable total ordering and opaque cursor bound to Organization, filters, and sort. Totals are not returned by default.
- Public IDs are opaque UUIDv7 strings. Instants use RFC 3339 UTC, civil dates use `YYYY-MM-DD`, local business time carries a timezone, and money uses a minor-unit string plus ISO currency. DTOs use camelCase and distinguish absent fields from explicit null.
- Tailwind CSS supplies styling. Primitive theme values use Tailwind theme variables, semantic aliases use CSS variables, and light/dark plus replaceable brand layers are complete.
- Visual components live in the repository under the UI package, follow shadcn conventions, and wrap an explicitly fixed Base UI primitive layer. CVA is the sole component-variant convention.
- The design system supplies accessible foundations, form controls, overlays, feedback, data display, responsive application navigation, and common product states. Charts remain optional and outside Foundation.
- Storybook is the executable component catalog. Automated accessibility checks complement, but do not replace, keyboard, focus, contrast, zoom, reduced-motion, and screen-reader review against WCAG 2.2 AA.
- Local development uses containers for PostgreSQL and Redis, synthetic seeds, a Clerk development instance, and optional provider configuration. PostHog and Sentry become no-op when absent. No fake authentication or payment implementation is introduced.
- Configuration is schema-validated and fails fast for critical dependencies. Public environment variables never contain secrets.
- The API baseline includes explicit CORS allowlists, secure headers, strict input validation, unknown-field rejection, body-size limits, layered rate limiting, safe errors, and structured redacted logging.
- The public repository uses GitHub Actions with frozen dependency installation, deterministic Turborepo caching, minimum workflow permissions, immutable Action references, and security scanning. Migration, deployment, and seed tasks are never cached.
- The project is open source under the MIT license and uses the provisional public name `next-nest-saas-starter`. Repository naming uses `saas`, not `sass`.

## Testing Decisions

- Tests assert externally observable behavior and security boundaries rather than private method calls, framework wiring, or ORM query shapes.
- The primary seam is one Playwright journey through Next.js, NestJS, and PostgreSQL. It covers authentication, Organization creation, Invitation acceptance when practical in the test environment, Active Organization switching, Role/Permission differences, Membership Suspension, and rejection of cross-Organization access.
- The API security seam exercises NestJS at the HTTP boundary against a real PostgreSQL instance. It covers verified identity adaptation, authorization order, strict validation, Problem Details, pagination, stale or mismatched Organization context, and cross-Organization read/write/enumeration attempts.
- The visual seam uses Storybook browser tests for states and interaction, automated accessibility checks, and focused manual accessibility review. Visual regressions cover semantic themes and critical application patterns.
- Vitest covers UI packages and pure shared behavior. Jest with NestJS testing utilities and Supertest covers API integration behavior. Unit tests are reserved for pure rules that cannot be observed economically through a higher seam.
- Contract verification serializes OpenAPI, regenerates the client, and fails when committed outputs drift. Pact is outside Foundation because there is only one first-party consumer.
- Test fixtures use synthetic Organizations, Users, Memberships, and resources. Tests never branch or copy production data.
- Organization-isolation tests are mandatory for every Organization-owned resource introduced in Foundation. A resource is not complete until another Organization is proven unable to read, mutate, or enumerate it.
- CI runs formatting, lint, type checking, unit and integration suites, Storybook interaction/accessibility tests, builds, and critical Playwright paths. Dependency review, static analysis, secret scanning, and workflow checks are required quality gates where the hosting platform supports them.
- Prior art does not exist in the repository because Foundation starts from documentation only. The first implemented tests establish the canonical fixtures, helpers, and high-level seams for later phases.

## Out of Scope

- Stripe Checkout, Customer Portal, Subscription projection, Plan pricing, Seat reconciliation, trials, Grace Period enforcement, and Read-only Organization billing transitions. These belong to Commerce.
- BullMQ job handlers, durable webhook inbox processing, Resend templates, Audit Events, and billing/security notification delivery. Their architectural boundaries may be bootstrapped, but behavior belongs to Commerce.
- File uploads, Railway Buckets, API Keys, outbound Webhook Endpoints and Deliveries, internal administration, in-app notifications, enterprise SSO, and internationalization. These belong to Extensions.
- Public demo deployment, coordinated Vercel/Railway/Neon preview automation, production backup automation and restore drills, full legal/governance content, release publication, migration guides, and final threat-model review. These belong to Public Release.
- Usage billing, multiple concurrent Subscriptions, runtime role builders, runtime Plan editors, PostgreSQL RLS, schema-per-Organization, database-per-Organization, microservices, multi-region deployment, custom domains, CMS, blog, charts, and automatic synchronization of changes into cloned products.
- Product-specific domain features. The Foundation proves Organization isolation with minimal settings and Membership behavior rather than inventing a sample commercial domain.

## Further Notes

- `CONTEXT.md` is the canonical glossary. User, Organization, Membership, Role, Permission, Active Organization, and related terms must not drift to account, workspace, tenant, user type, or access level in tickets and code.
- ADRs under `docs/adr/` are binding constraints for this phase unless explicitly superseded.
- The public name remains provisional until repository creation. The current workspace directory is still named `template-sass`; renaming is an implementation operation, not part of this specification publication.
- Optional modules will ultimately be removed from clones by documented recipes rather than hidden behind permanent runtime flags.
