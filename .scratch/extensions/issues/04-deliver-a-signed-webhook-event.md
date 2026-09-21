# 04: Deliver a signed Webhook event

**What to build:** an Owner registers a safe Webhook Endpoint and receives a
signed, versioned, retryable Webhook Delivery for a selected Organization event.

**Blocked by:** 01 — Record and review Audit Events.

**Status:** ready-for-agent

- [ ] Endpoint validation prevents SSRF at registration and delivery time.
- [ ] Each Delivery has a stable event ID, timestamp, signature, attempt record, bounded retry, and dead-letter outcome.
- [ ] Authorized replay creates a distinct Delivery attempt and an Audit Event; tests cover disabled and duplicate paths.
