# 05: Operate observability and alerts

**What to build:** an operator can use readiness, correlation IDs, redacted logs,
optional telemetry, and alerts to diagnose web, API, worker, queue, webhook,
and migration failures.

**Blocked by:** 02 — Configure a production-like environment.

**Status:** ready-for-agent

- [ ] Runbooks distinguish ready, degraded, and unready states for every deployed process.
- [ ] Alert payloads omit secrets and personal data while retaining useful correlation context.
- [ ] Optional PostHog and Sentry configuration remains disabled safely when absent.
