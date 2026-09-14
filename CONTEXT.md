# B2B SaaS Foundation

A reusable, production-ready foundation for business-to-business software products in which customers organize people, data, access, and billing.

## Language

**Organization**:
The business customer that owns its data, memberships, subscription, and access to product capabilities. It is the isolation and billing boundary.
_Avoid_: Workspace, account, company, tenant

**Active Organization**:
The Organization currently selected by a User as the scope for product access and authorization.
_Avoid_: Current tenant, selected account

**User**:
A person with an identity who can participate in one or more Organizations.
_Avoid_: Account, customer

**Membership**:
The relationship that places a User in an Organization and assigns the User a Role within that Organization.
_Avoid_: Member, seat

**Membership Suspension**:
A reversible state that prevents a Membership from accessing its Organization while retaining its history. A suspended Membership is not active and does not consume a Seat.
_Avoid_: Membership deletion, User deletion

**Invitation**:
An offer to join an Organization that has not yet become a Membership. A pending Invitation does not consume a Seat.
_Avoid_: Pending member, pending user

**Role**:
A named grouping of Permissions assigned to a Membership. The foundation starts with Owner, Admin, and Member roles.
_Avoid_: Access level, user type

**Permission**:
An action that a Membership is authorized to perform within an Organization.
_Avoid_: Capability, privilege

**Plan**:
A versioned commercial offering that determines which Capabilities an Organization may use and may optionally establish a seat allowance.
_Avoid_: Tier, package

**Capability**:
A product function made available to an Organization by its Plan, independently of whether a particular Membership has Permission to use it.
_Avoid_: Permission, feature flag, entitlement

**Subscription**:
An Organization's commercial agreement for a Plan.
_Avoid_: Plan, payment, billing account

**Grace Period**:
The seven-day interval after a Subscription becomes past due during which the Organization retains normal product access.
_Avoid_: Trial, free period

**Read-only Organization**:
An Organization whose Grace Period has ended and whose Members may view and export existing data but may not change domain state. Billing recovery, security operations, and leaving the Organization remain available.
_Avoid_: Suspended user, canceled Organization

**Organization Deletion**:
A strongly confirmed, reversible request that blocks access to an Organization and schedules its data for removal after 30 days.
_Avoid_: User deletion, cancellation

**Seat**:
A billing unit consumed by an active Membership, including Memberships with the Owner Role.
_Avoid_: User, Invitation, license

**Audit Event**:
An immutable record of a security-sensitive or administrative action within an Organization, including its actor, target, and occurrence time.
_Avoid_: Activity, log message

**API Key**:
A revocable credential through which an Organization grants scoped machine access to the product.
_Avoid_: User token, session token

**Webhook Endpoint**:
A destination registered by an Organization to receive selected product events.
_Avoid_: Callback, integration URL

**Webhook Delivery**:
A recorded attempt to send one product event to a Webhook Endpoint.
_Avoid_: Webhook, request
