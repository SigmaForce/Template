# 02: Document Vercel, Railway, and Neon production configuration

**What to build:** environment-specific configuration guide for web, API,
worker, Redis, Neon pooled/direct URLs, Clerk, Stripe, and observability.

**Blocked by:** 01.

**Status:** ready-for-agent

- Secrets are assigned to the correct provider and process.
- Browser-visible values are distinguished from server-only secrets.
- Direct migration connection is never used by runtime services.
- Configuration checks and rollback implications are documented.
