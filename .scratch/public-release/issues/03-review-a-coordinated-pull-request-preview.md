# 03: Review a coordinated pull-request preview

**What to build:** a contributor opens a pull request and receives one matched
Vercel web preview, Railway API/worker environment, and short-lived Neon branch
with synthetic data that are destroyed together when the pull request closes.

**Blocked by:** 02 — Configure a production-like environment.

**Status:** ready-for-agent

- [ ] Preview URLs refer only to the matching ephemeral API, worker, and Neon branch.
- [ ] Migration and synthetic seed run once for the preview and cannot select production data or credentials.
- [ ] Pull-request close teardown removes the coordinated resources and stale secrets.
