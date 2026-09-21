# Commerce specification

**Status:** ready-for-agent

## Problem Statement

A template adopter needs to sell access to a product without making the web
application a payment processor or allowing provider delivery order to decide
Organization access. The Foundation establishes Organization, Membership,
Permission, Capability, worker, and API seams, but it intentionally has no
Plan, Subscription, Seat, Checkout, or Grace Period behavior.

## Solution

Commerce makes Stripe the financial authority while the application keeps an
idempotent Organization-scoped Subscription projection for low-latency
authorization. A versioned code catalog defines Plans and Capabilities; Stripe
identifiers come from server configuration. Owners use Stripe Checkout and
Customer Portal. Signed Stripe events enter a durable inbox, then an
idempotent worker projects financial state, Seat use, and the Read-only
Organization transition after the seven-day Grace Period.

## User Stories

1. As an Owner, I want to view the available Plans, so that I can choose an offering for my Organization.
2. As an Owner, I want a Plan to expose its included Capabilities and Seat allowance, so that I understand what my Organization receives.
3. As an Owner, I want to start Stripe Checkout, so that payment details never pass through the product.
4. As an Owner, I want upgrades to take effect immediately with Stripe proration, so that my Organization can use newly purchased Capabilities promptly.
5. As an Owner, I want downgrades and cancellations to take effect at period end, so that the billing schedule is predictable.
6. As an Owner, I want to open Stripe Customer Portal, so that I can manage billing details through Stripe.
7. As a User, I want my Organization access to reflect a completed Subscription, so that payment and product availability agree.
8. As an Owner, I want duplicate Stripe events to be harmless, so that provider retries do not create duplicate access changes.
9. As an operator, I want delayed and out-of-order Stripe events projected safely, so that a late event cannot regress current access.
10. As an Owner, I want active Memberships to consume Seats, so that seat limits match people who can access the Organization.
11. As an Owner, I want a pending Invitation and a suspended Membership not to consume a Seat, so that I can administer participation fairly.
12. As an Owner, I want an over-seat change rejected before access is granted, so that Plan limits are enforceable.
13. As a User, I want Capabilities to remain separate from Permissions, so that a permitted action is unavailable when the Plan does not include it.
14. As an Owner, I want a seven-day Grace Period after a Subscription becomes past due, so that temporary payment failures do not immediately block work.
15. As a User in a Read-only Organization, I want to view and export existing data while mutation is denied, so that I can recover safely.
16. As an Owner, I want billing recovery to remain available in a Read-only Organization, so that I can restore normal access.
17. As an operator, I want to reconcile Stripe with the local Subscription projection, so that operational repair is possible without trusting stale local data.
18. As a security reviewer, I want every Commerce operation scoped to the Active Organization, so that one Organization cannot inspect or change another's billing state.

## Implementation Decisions

- ADR-0003 governs Stripe financial authority, local access projection,
  proration, scheduled downgrade, cancellation, and Grace Period behavior.
- ADR-0004 governs all durable Commerce work: bounded retry, backoff,
  idempotency, and dead-letter handling in the worker.
- ADR-0008 governs raw-body signature verification, inbox deduplication,
  asynchronous processing, and audited administrative replay.
- ADR-0012 governs versioned Plan and Capability definitions. Plans are not
  editable at runtime; environment configuration maps stable definitions to
  Stripe product and price identifiers.
- Subscription, Seat, inbox, and reconciliation records are Organization
  scoped. Repository access and API queries always include that scope.
- Checkout and Customer Portal session creation require the existing Owner
  billing Permission. Return URLs are configured allowlisted product origins.
- The authorization order remains identity, Active Organization, active
  Membership, Organization state, Plan Capability, Role Permission, and
  resource invariant. A Capability never substitutes for a Permission.
- Billing state is projected from Stripe events, never supplied by browser
  requests or copied from a Stripe response directly into authorization state.

## Testing Decisions

- The primary seam is an end-to-end Organization journey: Owner starts a
  Checkout session, a signed synthetic Stripe event is ingested and processed,
  and a later API request observes the projected Capability.
- API integration tests exercise raw webhook verification, inbox deduplication,
  Active Organization scoping, Seat enforcement, and Read-only mutation denial.
- Worker integration tests exercise idempotent projection, delayed deliveries,
  bounded retry, and reconciliation using synthetic provider events.
- Browser tests exercise Owner-visible billing controls and accessible pending,
  past-due, error, and Read-only states through the existing UI test seam.
- Existing authorization, Organization isolation, API contract, Storybook, and
  Playwright seams are extended instead of creating test-only abstractions.

## Out of Scope

Usage billing, tax calculation, invoices authored by the application, manual
payment collection, multiple concurrent Subscriptions, runtime Plan editing,
discount engines, and a generic feature-flag product.

## Further Notes

Card data, Stripe secrets, webhook signatures, and billing-provider payloads
never enter browser bundles or application logs. Commerce test data is
synthetic and uses Stripe test mode only.
