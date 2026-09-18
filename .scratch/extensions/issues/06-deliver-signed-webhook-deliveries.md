# 06: Deliver signed Webhook events durably

**What to build:** worker-backed Webhook Deliveries with signatures, idempotency,
bounded retries, replay controls, and delivery observability.

**Blocked by:** 05.

**Status:** ready-for-agent

- Delivery payloads carry event IDs, version, timestamp, and signature.
- Retry and dead-letter behavior cannot block API requests.
- Authorized replay creates an Audit Event and a distinct delivery attempt.
- Tests cover duplicate delivery, disabled endpoints, and SSRF rejection.
