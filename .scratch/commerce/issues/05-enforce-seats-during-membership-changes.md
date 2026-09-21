# 05: Enforce Seats during Membership changes

**What to build:** an Owner can manage Memberships while active Memberships
consume Seats and pending Invitations, suspended Memberships, and removed
Memberships do not.

**Blocked by:** 03 — Start Checkout and activate a Subscription.

**Status:** ready-for-agent

- [ ] A Seat allowance from the selected Plan prevents an over-limit Membership activation or Invitation acceptance.
- [ ] Membership Suspension releases a Seat without deleting Membership history.
- [ ] Tests prove concurrent Membership changes cannot exceed the Organization's allowance.
