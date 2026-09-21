# Extensions specification

**Status:** ready-for-agent

## Problem Statement

Product adopters need optional integrations—Audit Events, Files, API Keys,
Webhook Endpoints, Webhook Deliveries, notifications, internal administration,
and localization—without converting the Foundation into a generic shared
module or weakening Organization isolation. These concerns require durable
ownership, operational boundaries, and a safe way for a clone to remove what
it does not need.

## Solution

Extensions add independent, removable Organization-owned modules. Audit Events
provide an immutable administrative history distinct from operational logs.
Files store object bytes in Railway Buckets with Organization-scoped metadata.
API Keys and Webhook Endpoints belong to an Organization, not their creator.
Webhook Deliveries and notifications run durably through the worker. Internal
Operators are a separate authorization boundary, while localization is added
only for declared supported locales.

## User Stories

1. As an Owner, I want to inspect Audit Events for my Organization, so that I can review sensitive administrative activity.
2. As a security reviewer, I want Audit Events to be immutable and separate from logs, so that diagnostics cannot be mistaken for a security record.
3. As an Owner, I want to upload and access Organization Files, so that product documents remain isolated from other Organizations.
4. As an Owner, I want Files to have safe type, size, and retention controls, so that uploads do not create a storage or security bypass.
5. As an Owner, I want to create an API Key with explicit scopes, so that a machine can access only intended Organization actions.
6. As an Owner, I want to rotate and revoke an API Key, so that a compromised credential can be recovered without deleting the Organization.
7. As a machine client, I want a revoked API Key rejected immediately, so that revocation is meaningful.
8. As an Owner, I want to register a Webhook Endpoint for selected product events, so that my Organization can integrate with external systems.
9. As an integration developer, I want signed, versioned Webhook Deliveries with stable event IDs, so that I can verify and deduplicate events.
10. As an Owner, I want delivery retries and replay visibility, so that I can recover an integration without contacting support.
11. As an operator, I want outbound endpoint validation to resist SSRF, so that an Organization cannot make the platform contact private infrastructure.
12. As an Owner, I want durable operational notifications, so that security, billing, and integration outcomes reach the right people.
13. As an Operator, I want a separately authorized administration surface, so that staff access does not inherit a customer Membership.
14. As a User, I want supported product copy and civil data presented in my declared locale, so that the product is understandable in supported regions.
15. As a template adopter, I want a documented removal recipe for an Extension, so that I can simplify a clone without dangling routes, migrations, queues, or contracts.
16. As a security reviewer, I want every Extension resource isolated by Organization, so that optional modules preserve the Foundation's boundary.

## Implementation Decisions

- ADR-0007 governs optional-module removal by documented recipe, not permanent
  feature flags.
- ADR-0013 governs Organization ownership, scopes, rotation, revocation,
  signing, versioning, retry, and idempotency for machine integrations.
- ADR-0017 distinguishes immutable Audit Events from structured operational
  logs. Audit Events contain safe domain context, not raw request payloads.
- ADR-0018 places File bytes in Railway Buckets and File metadata in PostgreSQL.
  Signed object access remains secondary to API authorization.
- ADR-0019 makes an Operator a distinct internal identity and authorization
  boundary, never a privileged Organization Role or Membership.
- Extensions reuse the existing authorization pipeline and the worker durability
  conventions; they do not create a generic service layer or event bus.
- Supported locales are declared before a translation mechanism is selected.
  Localization does not silently change stored instants, money, or Organization
  timezone semantics.

## Testing Decisions

- The primary API seam verifies Organization-scoped creation, use, revocation,
  and cross-Organization denial for each Extension resource.
- The primary delivery seam registers a synthetic Webhook Endpoint, emits a
  versioned event, verifies its signature, retries deterministically, and
  records a distinct Delivery attempt.
- Browser tests cover accessible Owner controls, one-time secret display,
  Audit Event read-only views, and disabled/error states.
- Worker tests use synthetic provider and endpoint behavior; they never call
  arbitrary public networks or handle production secrets.
- Removal recipes are tested against a clean clone before an Extension is
  considered complete.

## Out of Scope

Marketplace plugins, customer-supplied executable code, a generic event bus,
enterprise SSO, custom schema per Organization, arbitrary locale selection,
and a promise to support every storage or notification provider.

## Further Notes

The canonical terms are File, Audit Event, API Key, Webhook Endpoint, Webhook
Delivery, and Operator. “Admin” remains an Organization Role, not an internal
staff authorization concept.
