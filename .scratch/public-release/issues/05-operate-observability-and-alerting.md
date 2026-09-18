# 05: Operate observability and alerting

**What to build:** production guidance and checks for readiness, structured
redacted logs, PostHog, Sentry, alert routing, and correlation IDs.

**Blocked by:** 02.

**Status:** ready-for-agent

- Disabled telemetry remains a no-op.
- Alerts use safe metadata and do not leak credentials or personal data.
- Readiness, queue failures, webhook dead letters, and migration failures are covered.
- Runbooks use correlation IDs to trace cross-service requests.
