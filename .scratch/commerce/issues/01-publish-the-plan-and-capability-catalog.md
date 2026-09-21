# 01: Publish the Plan and Capability catalog

**What to build:** an Owner can view the versioned Plans, their Capabilities,
and Seat allowances for the Active Organization without any runtime Plan editor.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Stable Plan and Capability definitions are exposed through an Organization-scoped API and accessible billing view.
- [x] Stripe product and price mappings come only from validated server configuration.
- [x] Tests prove the catalog is deterministic and does not confuse a Capability with a Permission.
