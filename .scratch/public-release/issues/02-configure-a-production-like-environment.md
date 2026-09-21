# 02: Configure a production-like environment

**What to build:** a maintainer can configure matching Vercel web, Railway API
and worker, Neon, Redis, Clerk, Stripe, and observability environments with
each secret owned by the correct process.

**Blocked by:** 01 — Publish open-source governance.

**Status:** ready-for-agent

- [ ] Configuration distinguishes browser-visible values from server-only secrets and validates each deployed process.
- [ ] Runtime services use pooled Neon connections; only the migration operation uses the direct connection.
- [ ] A configuration walkthrough verifies readiness without publishing secret values or production data.
