# 04: Manage a Subscription in Customer Portal

**What to build:** an Owner opens Stripe Customer Portal and sees projected
upgrade, scheduled downgrade, and cancellation state in the Organization
billing view.

**Blocked by:** 03 — Start Checkout and activate a Subscription.

**Status:** ready-for-agent

- [ ] Customer Portal sessions require the Owner billing Permission and an allowlisted return URL.
- [ ] Upgrade, scheduled downgrade, and cancellation events are idempotently reflected in the billing view.
- [ ] Browser and API tests cover pending, unavailable, and unauthorized portal states.
