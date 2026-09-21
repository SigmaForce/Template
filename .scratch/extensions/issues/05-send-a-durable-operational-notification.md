# 05: Send a durable operational notification

**What to build:** a security, billing, or integration outcome creates a typed
notification intent that is delivered durably without exposing raw request data.

**Blocked by:** 04 — Deliver a signed Webhook event.

**Status:** ready-for-agent

- [ ] Notification content derives from typed safe intent data and follows Organization ownership.
- [ ] Provider absence degrades safely; provider failures retry idempotently in the worker.
- [ ] Significant sends create Audit Events and tests prove secret redaction in errors and logs.
