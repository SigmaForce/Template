# 03: Configure the Stripe boundary

**What to build:** a narrowly scoped Stripe adapter with validated server-only
keys, webhook secret verification, and safe readiness behavior.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- Stripe keys and webhook secret never reach web bundles or logs.
- Missing configuration leaves Commerce disabled locally without fake payments.
- Raw-body signature verification is available only at the webhook boundary.
- Adapter failures produce safe Problem Details and structured redacted logs.
