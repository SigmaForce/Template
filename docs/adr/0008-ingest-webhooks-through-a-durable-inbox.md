# Ingest webhooks through a durable inbox

Inbound provider webhooks are authenticated against their original request body, deduplicated by provider event ID in PostgreSQL, acknowledged quickly, and processed asynchronously by idempotent BullMQ handlers. This durable inbox accepts eventual, duplicated, and out-of-order delivery in exchange for additional persistence and replay tooling; administrative replays always produce an Audit Event.
