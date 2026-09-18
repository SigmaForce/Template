# Public Release specification

**Status:** ready-for-agent

## Goal

Publish the template safely as an MIT-licensed public repository with repeatable
Vercel, Railway, and Neon deployments; coordinated preview environments;
release documentation; recovery operations; and a final threat-model review.

## Governing decisions

- ADR-0007: releases are versioned and clones are not automatically updated.
- ADR-0009: Neon provides pooled runtime and direct migration connections.
- ADR-0010: previews coordinate Vercel, Railway, and short-lived Neon branches.

## Boundaries

- Preview data is synthetic or anonymized, never production-derived by default.
- Neon pooled connections serve runtime processes; one direct connection runs
  migrations under a concurrency lock.
- Backups, restore drills, secrets, and platform configuration are documented
  as human-owned operations where automation cannot safely hold authority.
- Releases are semantic, versioned, and accompanied by migration guidance; no
  cloned product receives automatic updates.

## Non-goals

Multi-region runtime, automatic customer migrations, managed hosting, and a
promise of production availability before operational checks are complete.

## Completion

A maintainer can configure a production-like environment, review a coordinated
preview, migrate once, recover from a tested backup, publish a release, and
understand the remaining security and operational limits.
