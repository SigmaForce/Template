# 04: Ingest Stripe events through a durable inbox

**What to build:** authenticated, deduplicated webhook ingestion that stores an
inbox record and returns promptly before any business projection work.

**Blocked by:** 02, 03.

**Status:** ready-for-agent

- Original request bytes are verified before parsing the Stripe event.
- Duplicate provider event IDs do not create another inbox record or effect.
- The response does not expose event content or secrets.
- API tests cover invalid signatures, duplicate delivery, and Organization-safe persistence.
