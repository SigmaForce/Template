# 04: Deploy with a single migration lock

**What to build:** a maintainer can release an application version with exactly
one direct Neon migration operation, an expand-contract rollback path, and no
cached or concurrent deploy/seed action against the same database.

**Blocked by:** 03 — Review a coordinated pull-request preview.

**Status:** ready-for-agent

- [ ] The release workflow serializes migrations per environment and records their outcome safely.
- [ ] Application rollback preserves forward-compatible schema changes and never performs automatic schema rollback.
- [ ] A disposable environment exercises failed migration and recovery instructions.
