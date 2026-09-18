# Extensions specification

**Status:** ready-for-agent

## Goal

Add removable Organization-owned integrations: Audit Events, files, API Keys,
outbound Webhooks, notifications, internal administration, and localization.
Each module has explicit ownership, authorization, operational behavior, and a
documented removal recipe rather than a permanent runtime switch.

## Governing decisions

- ADR-0007: optional modules are removed by recipe.
- ADR-0013: machine integrations are Organization owned.
- ADR-0017: Audit Events are distinct from operational logs.
- ADR-0018: Files use Railway Buckets with PostgreSQL metadata.
- ADR-0019: Operators are separate from Organization Roles.

## Boundaries

- API Keys and Webhook Endpoints belong to an Organization; a creator is audit
  metadata, never the owner.
- File bytes use managed object storage; metadata remains Organization scoped.
- Outbound deliveries are versioned, signed, retryable, idempotent jobs.
- Audit Events are immutable security records, not application logs.
- Extensions reuse the API authorization pipeline and worker durability model.

## Non-goals

Marketplace plugins, arbitrary customer code execution, generic event buses,
enterprise SSO, and runtime schema customization.

## Completion

Each extension can be safely enabled, operated, tested, and removed from a
clone without breaking Foundation or Commerce.
