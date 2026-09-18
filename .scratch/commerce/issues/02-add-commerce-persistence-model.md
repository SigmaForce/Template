# 02: Add Organization-scoped Commerce persistence

**What to build:** expand-only Prisma schema for Subscription projections,
Webhook Inbox records, and Seat accounting inputs.

**Blocked by:** 01.

**Status:** ready-for-agent

- Every record has Organization scoping and appropriate compound uniqueness.
- Stripe event IDs are unique and persist raw processing metadata safely.
- Migrations are forward-compatible and use the direct database connection.
- Repositories expose no unscoped Subscription or inbox lookup.
