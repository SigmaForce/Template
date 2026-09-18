# 10: Apply Grace Period and read-only Organization policy

**What to build:** a seven-day past-due Grace Period followed by centralized
read-only Organization enforcement and recovery behavior.

**Blocked by:** 06, 08.

**Status:** ready-for-agent

- Normal access remains during Grace Period.
- After Grace Period, mutation is denied while documented read/export,
  billing recovery, security, and leave flows remain available.
- Restored payment re-enables normal access idempotently.
- Time-boundary tests avoid wall-clock flakes.
