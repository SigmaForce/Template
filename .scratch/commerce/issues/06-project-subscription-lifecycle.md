# 06: Project the Subscription lifecycle

**What to build:** idempotent projection of Stripe subscription events into the
local Organization Subscription state.

**Blocked by:** 02, 05.

**Status:** ready-for-agent

- Events are ordered by Stripe timestamps/version rules, not delivery order.
- Upgrade, scheduled downgrade, cancellation, and past-due state are explicit.
- A projection can be rebuilt without calling payment APIs from request paths.
- Tests cover duplicate, delayed, and out-of-order events.
