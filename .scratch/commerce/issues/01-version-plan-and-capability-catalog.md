# 01: Version the Plan and Capability catalog

**What to build:** reviewed code definitions for Plans, Capabilities, Stripe
product/price mappings, and the default free/development plan.

**Blocked by:** Foundation 16.

**Status:** ready-for-agent

- Plan and Capability identifiers use stable, documented names.
- Each Plan declares its Capabilities and optional Seat allowance.
- Stripe identifiers are environment configuration, not source constants.
- The catalog has tests for mappings and duplicate identifiers.
