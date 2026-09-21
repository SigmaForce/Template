# 07: Complete the final threat model

**What to build:** a security reviewer can inspect authenticated Organizations,
Commerce, Extensions, previews, supply chain, backups, and operational access
with explicit mitigations, residual risks, and remediation owners.

**Blocked by:** 03 — Review a coordinated pull-request preview; 04 — Deploy with a single migration lock; 05 — Operate observability and alerts; 06 — Complete an isolated backup and restore drill.

**Status:** ready-for-agent

- [ ] The review covers cross-Organization access, webhook and API Key abuse, preview isolation, secret handling, and recovery paths.
- [ ] Evidence links to executable tests, provider configuration checks, and restore results rather than unsupported claims.
- [ ] Material unresolved risks become tracked remediation issues before launch.
