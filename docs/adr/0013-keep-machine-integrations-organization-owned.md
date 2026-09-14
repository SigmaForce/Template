# Keep machine integrations Organization-owned

API Keys and outbound Webhook Endpoints belong to an Organization rather than to the User who created them, with the creator retained only for audit. This prevents User deletion from silently breaking customer integrations, but requires explicit scopes, rotation and revocation for credentials plus signed, versioned, retryable, and idempotent Webhook Deliveries; the entire integration surface remains an optional removable module.
