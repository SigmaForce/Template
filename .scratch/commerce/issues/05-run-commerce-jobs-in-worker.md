# 05: Run Commerce inbox jobs in the worker

**What to build:** BullMQ queue registration and an idempotent worker handler
for Commerce inbox records.

**Blocked by:** 04.

**Status:** ready-for-agent

- Enqueueing happens after the inbox write succeeds.
- Retries have bounded backoff and a documented dead-letter path.
- Reprocessing a record is safe and observable by correlation ID.
- Redis failure degrades queued Commerce work without making read paths fail.
