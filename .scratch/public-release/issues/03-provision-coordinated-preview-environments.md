# 03: Provision coordinated preview environments

**What to build:** pull-request previews that coordinate Vercel web, Railway
API/worker, and a short-lived Neon branch with synthetic seed data.

**Blocked by:** 02.

**Status:** ready-for-agent

- Preview URLs are wired only to matching ephemeral services and database branch.
- Migrations and synthetic seed run once per preview environment.
- Provider resources and secrets are destroyed when the pull request closes.
- Production connections can never be selected by a preview workflow.
