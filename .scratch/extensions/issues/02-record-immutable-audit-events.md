# 02: Record immutable Audit Events

**What to build:** Organization-scoped Audit Events for security-sensitive and
administrative actions, with authorized read access and no mutation endpoint.

**Blocked by:** 01.

**Status:** ready-for-agent

- Actor, target, action, timestamp, and safe context are captured consistently.
- Events are immutable and scoped at repository and API boundaries.
- Sensitive request payloads and credentials are never recorded.
- Tests prove cross-Organization enumeration is denied.
