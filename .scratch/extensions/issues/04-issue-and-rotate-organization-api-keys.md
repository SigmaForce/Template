# 04: Issue and rotate Organization API Keys

**What to build:** scoped Organization-owned API Keys with one-time plaintext
display, hashed storage, rotation, revocation, and audit trail.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- Key material is never stored, logged, or returned after creation.
- Authorization derives Organization and scopes from the verified key.
- Rotation allows a bounded overlap and revocation is immediate.
- Rate limits and tests cover invalid, revoked, and cross-Organization keys.
