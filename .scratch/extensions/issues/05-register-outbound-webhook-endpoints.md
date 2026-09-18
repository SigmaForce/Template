# 05: Register outbound Webhook Endpoints

**What to build:** Organization-owned endpoint registration with selected event
types, secret management, SSRF defenses, and lifecycle audit events.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- Endpoint URLs are validated against SSRF policy and cannot target private networks.
- Secrets are displayed once and stored safely.
- Event schemas are versioned and explicit.
- Endpoints can be disabled, rotated, and removed by authorized administrators.
