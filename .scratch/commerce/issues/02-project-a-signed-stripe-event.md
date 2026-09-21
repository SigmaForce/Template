# 02: Project a signed Stripe event

**What to build:** a signed synthetic Stripe Subscription event is accepted once,
processed by the worker, and shown as the Active Organization's projected
Subscription state.

**Blocked by:** 01 — Publish the Plan and Capability catalog.

**Status:** ready-for-agent

- [ ] The API verifies the original request body, persists one deduplicated inbox record, and acknowledges safely.
- [ ] The worker projects the Subscription idempotently with bounded retry and safe observability.
- [ ] Tests prove invalid signatures, duplicate events, and cross-Organization reads are denied.
