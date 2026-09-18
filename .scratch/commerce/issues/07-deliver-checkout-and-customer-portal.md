# 07: Deliver Checkout and Customer Portal entry points

**What to build:** Owner-only API and web actions that create Stripe Checkout
and Customer Portal sessions for the Active Organization.

**Blocked by:** 03, 06.

**Status:** ready-for-agent

- Only the Owner billing Permission can create a session.
- Return URLs are allowlisted and bound to the requesting Organization.
- The web redirects to Stripe; it does not implement payment forms.
- Session creation is idempotent where Stripe supports it.
