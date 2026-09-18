# 11: Build the Organization Commerce surface

**What to build:** an accessible billing view for Plan, Subscription status,
Seat use, read-only state, Checkout, and Customer Portal entry points.

**Blocked by:** 07, 09, 10.

**Status:** ready-for-agent

- UI uses `@saas/ui` states and semantic tokens.
- Owner-only actions are absent from unauthorized views and still guarded by API.
- Loading, error, past-due, and read-only states are understandable without color alone.
- Storybook and browser accessibility tests cover the surface.
