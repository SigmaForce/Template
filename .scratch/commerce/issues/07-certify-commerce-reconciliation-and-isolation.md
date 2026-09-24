# 07: Certify Commerce reconciliation and isolation

**What to build:** an operator can reconcile Stripe authority with local
projections, repair safely through audited replay, and verify the complete
Commerce journey cannot cross Organization boundaries.

**Blocked by:** 04 — Manage a Subscription in Customer Portal; 05 — Enforce Seats during Membership changes; 06 — Apply Grace Period and Read-only access.

**Status:** ready-for-agent

- [x] Reconciliation identifies drift without granting access from untrusted local state.
- [x] Replay and repair are idempotent, authorized, and produce an Audit Event when that Extension is enabled.
- [x] CI covers synthetic checkout, webhook, worker, Capability, Seat, Grace Period, and cross-Organization denial paths.
