# 09: Reconcile Seats with Membership lifecycle

**What to build:** Organization-scoped Seat accounting that reacts to active,
suspended, removed, and invited people without treating an Invitation as a Seat.

**Blocked by:** 01, 06.

**Status:** ready-for-agent

- Active Memberships, including Owners, consume Seats.
- Suspended and removed Memberships plus pending Invitations do not consume Seats.
- Seat allowance enforcement is race-safe at the API boundary.
- Stripe quantity updates are durable jobs, not synchronous request side effects.
