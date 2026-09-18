# 12: Certify Commerce reconciliation and security

**What to build:** operator reconciliation flow, documented recovery steps, and
end-to-end certification for Commerce correctness and Organization isolation.

**Blocked by:** 04, 05, 06, 07, 08, 09, 10, 11.

**Status:** ready-for-agent

- Reconciliation compares Stripe authority with the local projection safely.
- Replay and repair actions are audited and idempotent.
- Integration tests prove cross-Organization billing access is denied.
- CI runs the required Commerce API, worker, and browser paths with synthetic data.
