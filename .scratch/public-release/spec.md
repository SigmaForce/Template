# Public Release specification

**Status:** ready-for-agent

## Problem Statement

The template can be technically complete yet unsafe or confusing to publish
without coordinated deployment, preview, migration, recovery, governance, and
security evidence. A maintainer needs a repeatable public-release path for
Vercel, Railway, Neon, and GitHub that never presents synthetic preview data or
unverified operational claims as production-ready guarantees.

## Solution

Public Release turns the completed product phases into a publishable MIT
template. It documents configuration, creates coordinated short-lived previews,
serializes direct Neon migrations, defines observability and recovery runbooks,
performs restore drills and a final threat-model review, then publishes an
honest demo and semantic release with migration guidance.

## User Stories

1. As a maintainer, I want public repository governance and security reporting guidance, so that contributors know how to participate and report risk.
2. As a deployer, I want provider-specific configuration for web, API, worker, database, Redis, authentication, billing, and observability, so that secrets go only to the process that needs them.
3. As a contributor, I want a pull request preview with matching web, API, worker, and Neon branch, so that I can review a coherent system rather than unrelated environments.
4. As a security reviewer, I want preview data to be synthetic or anonymized, so that a pull request cannot expose production data.
5. As a maintainer, I want migrations to run once through a direct connection, so that concurrent deploys do not race against the same schema.
6. As a maintainer, I want rollback instructions that respect expand-contract migrations, so that reverting an application does not corrupt the database.
7. As an operator, I want readiness, errors, queues, and delivery failures observable through safe logs and telemetry, so that incidents can be diagnosed.
8. As an operator, I want alerts to avoid secrets and personal data, so that operational tooling does not become an exposure path.
9. As a maintainer, I want backups retained and encrypted with an off-provider copy, so that Neon or account failures have a recovery path.
10. As an operator, I want restore drills in an isolated environment, so that backup claims are supported by evidence.
11. As a security reviewer, I want a final threat model covering Organizations, payment, machine integrations, previews, supply chain, and operations, so that residual risks are explicit.
12. As a template adopter, I want release notes and migration guidance, so that I can evaluate a version without assuming my clone will update automatically.
13. As a visitor, I want a public demo that uses dedicated synthetic data, so that I can evaluate the template without accessing a customer environment.
14. As a maintainer, I want a launch checklist with test, preview, restore, and security evidence, so that publication is a deliberate decision.

## Implementation Decisions

- ADR-0007 governs semantic releases, changelogs, migration guides, and the
  explicit absence of automatic updates to clones.
- ADR-0009 governs Neon pooled runtime connections, the single direct migration
  job, expand-contract rollout, seven-day recovery posture, and restore drills.
- ADR-0010 governs coordinated Vercel, Railway, and Neon preview environments
  with synthetic data, matching URLs, and teardown on pull-request close.
- GitHub Actions remains declarative and minimally privileged. Provider tokens
  live in protected environments and are never logged or cached.
- Production configuration remains human-owned in provider dashboards when that
  authority cannot be safely committed. Repository documentation names exact
  ownership and verification steps without storing secrets.
- The public demo is a dedicated environment. It is not a shared staging or a
  production data mirror.

## Testing Decisions

- The primary release seam is a disposable pull-request preview: web, API,
  worker, database migration, and synthetic seed must belong to the same
  ephemeral environment and be removed together.
- A disposable restore environment is the recovery seam: restore a backup,
  migrate forward if necessary, and run synthetic verification without touching
  a live environment.
- CI continues to run existing contract, API, worker, browser accessibility,
  security, and smoke seams; release automation adds provider integration checks
  rather than replacing them.
- Threat-model review verifies observable attack paths and documents residual
  risk; it does not assert security from documentation alone.

## Out of Scope

Managed hosting for clones, multi-region active-active runtime, automatic clone
migrations, unlimited support commitments, production data previews, and any
claim of compliance certification without a separate assessed program.

## Further Notes

Public Release starts only after Commerce and Extensions are certified. A
successful deployment is necessary but insufficient: preview cleanup, backup
restore evidence, and threat-model remediation are release gates.
