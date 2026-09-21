# 06: Complete an isolated backup and restore drill

**What to build:** a maintainer can create an encrypted off-provider backup and
restore it into an isolated environment, then verify recovery without
overwriting a live Organization database.

**Blocked by:** 04 — Deploy with a single migration lock; 05 — Operate observability and alerts.

**Status:** ready-for-agent

- [ ] Backup access, encryption, retention, and responsible owner are documented.
- [ ] Restore verification uses an isolated environment and synthetic checks, never automatic live replacement.
- [ ] The drill records honest recovery-time and data-loss assumptions.
