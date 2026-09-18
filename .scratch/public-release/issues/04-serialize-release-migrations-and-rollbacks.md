# 04: Serialize release migrations and rollback operations

**What to build:** deployment workflow that locks a single direct migration,
uses expand-contract, and documents application rollback without schema rollback.

**Blocked by:** 02, 03.

**Status:** ready-for-agent

- Exactly one migration job runs per environment and release.
- Deploy and seed operations are not cached or concurrent against the same database.
- Rollback steps preserve forward-compatible schema changes.
- Failed migration and recovery procedures are tested in a disposable environment.
