# 06: Operate through a separate Operator boundary

**What to build:** an Operator can perform explicitly authorized internal
operations without becoming an Organization Owner, Admin, or Member.

**Blocked by:** 01 — Record and review Audit Events.

**Status:** ready-for-agent

- [x] Operator identity, permissions, session handling, and audit trail are distinct from User Memberships.
- [x] Operator actions still require explicit Organization scope where they inspect customer data.
- [x] Tests prove an Organization Role cannot gain Operator authority and vice versa.
