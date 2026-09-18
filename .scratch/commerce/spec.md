# Commerce specification

**Status:** ready-for-agent

## Goal

Add the commercial layer without weakening Foundation authorization: Stripe is
the financial authority; the application owns a versioned Plan-to-Capability
catalog and an idempotent local Subscription projection. An Organization moves
to read-only only after its seven-day Grace Period ends.

## Governing decisions

- ADR-0003: Stripe is financially authoritative; access is locally projected.
- ADR-0004: durable work runs in BullMQ workers.
- ADR-0008: inbound provider events use a durable inbox.
- ADR-0012: Plan and Capability definitions are versioned in code.

## Boundaries

- Stripe Checkout and Customer Portal are the only payment UI; card data never
  reaches the web or API.
- The API verifies the raw Stripe webhook body, writes a deduplicated inbox
  record, acknowledges quickly, and delegates processing to BullMQ.
- The worker processes inbox records idempotently with bounded retry, backoff,
  and a dead-letter convention.
- Plans and Capabilities are versioned code reviewed definitions. Environment
  configuration maps them to Stripe product and price IDs.
- Subscription, Seat, Grace Period, and read-only decisions are Organization
  scoped and evaluated through the existing authorization pipeline.

## Non-goals

Usage billing, multiple concurrent Subscriptions, runtime Plan editors, tax
engines, manual payment collection, and a generic feature-flag system.

## Completion

An Owner can start Checkout, manage billing through Stripe, and observe a
projected Subscription. Delayed, duplicated, and out-of-order webhooks cannot
grant incorrect access; the complete Commerce journey is covered by API and
worker tests.
