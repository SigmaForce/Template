# 03: Issue and revoke an API Key

**What to build:** an Owner creates an Organization-owned scoped API Key,
receives its plaintext once, and can rotate or revoke it with an Audit Event.

**Blocked by:** 01 — Record and review Audit Events.

**Status:** ready-for-agent

- [x] Only a verifier-safe representation is stored; plaintext Key material is never logged or returned again.
- [x] Requests derive Organization and scopes from the verified Key and reject revoked keys immediately.
- [x] Tests cover scope denial, rotation overlap, revocation, rate limits, and cross-Organization misuse.
