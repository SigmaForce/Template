# 06: Apply Grace Period and Read-only access

**What to build:** a past-due Subscription preserves normal access for seven
days, then makes the Organization read-only while billing recovery and allowed
security operations remain available.

**Blocked by:** 03 — Start Checkout and activate a Subscription; 05 — Enforce Seats during Membership changes.

**Status:** ready-for-agent

- [ ] The projected past-due timestamp, not browser time or a request field, controls the Grace Period.
- [ ] Mutation is denied centrally after Grace Period while documented read, export, billing recovery, and leave paths remain available.
- [ ] Payment recovery restores normal access idempotently and boundary tests avoid wall-clock flakes.
