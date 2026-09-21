# 03: Start Checkout and activate a Subscription

**What to build:** an Owner starts Stripe Checkout for the Active Organization,
then a completed checkout projects the selected Plan and makes its Capability
available through the existing authorization pipeline.

**Blocked by:** 02 — Project a signed Stripe event.

**Status:** ready-for-agent

- [x] Only the Owner billing Permission can create an allowlisted Checkout session.
- [x] Card data and Stripe secrets never pass through the web application or logs.
- [x] The end-to-end test proves checkout completion changes Organization access only after projection.
