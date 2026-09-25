# 01: Record and review Audit Events

**What to build:** an Owner can review immutable Organization-scoped Audit
Events for sensitive administration without treating operational logs as an
audit record.

**Blocked by:** Commerce 07 — Certify Commerce reconciliation and isolation.

**Status:** ready-for-agent

- [x] Sensitive Organization actions create immutable events with safe actor, target, action, and occurrence context.
- [x] Authorized read access is Organization scoped; mutation and cross-Organization enumeration are denied.
- [x] Tests prove secrets, raw request payloads, and operational log content are absent from Audit Events.
