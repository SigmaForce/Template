# 08: Enforce Plan Capabilities centrally

**What to build:** a Capability decision in the existing authorization order,
using the projected Subscription and versioned catalog.

**Blocked by:** 01, 06.

**Status:** ready-for-agent

- Capability denial has a stable public error and cannot be bypassed by web state.
- Permission and Capability remain distinct in code and documentation.
- Existing Foundation operations preserve their documented default Capability.
- API tests prove denial for an Organization without the Capability.
