# Version and deduplicate the public API

REST endpoints use a `/v1` prefix and cursor pagination, and externally repeatable commands that create resources or financial effects accept an Organization-scoped `Idempotency-Key`. The server persists a payload hash and response for a documented interval and rejects reuse with a different payload, trading storage and cleanup work for a stable retry contract that avoids duplicate effects after client timeouts.
