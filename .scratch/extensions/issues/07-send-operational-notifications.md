# 07: Send operational notifications

**What to build:** durable notification intents and provider adapters for
security, billing, and integration delivery events.

**Blocked by:** 02, 06.

**Status:** ready-for-agent

- Notification content is generated from typed intents, not raw request data.
- Delivery retries are idempotent and redacted in logs.
- Provider configuration is optional and readiness degrades safely when absent.
- Notifications respect Organization ownership and audit significant sends.
