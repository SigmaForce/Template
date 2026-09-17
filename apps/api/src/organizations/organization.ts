import {
  AuthorizationRepository,
  type OrganizationAccessState,
} from '../authorization/authorization.js';
import type { OrganizationRole } from '../authorization/permission.js';

export interface OrganizationProfile {
  id: string;
  locale: string;
  name: string;
  slug: string;
  timeZone: string;
}

export interface OrganizationOnboardingResult {
  membership: { role: 'owner' };
  organization: OrganizationProfile;
}

export interface AcceptedInvitationResult {
  membership: { role: OrganizationRole };
  organization: { id: string; slug: string };
}

export interface MembershipRecord {
  organizationId: string;
  role: OrganizationRole;
  status: 'active' | 'removed' | 'suspended';
  userId: string;
}

export interface CompleteFirstOrganizationRecord {
  idempotencyKey: string;
  organization: OrganizationProfile;
  requestHash: string;
  userId: string;
}

export type OrganizationOnboardingClaim =
  | { status: 'claimed' }
  | { status: 'replay'; result: OrganizationOnboardingResult }
  | { status: 'already-complete' | 'conflict' | 'in-progress' };

export abstract class OrganizationRepository extends AuthorizationRepository {
  abstract findMembershipRecord(input: {
    organizationId: string;
    userId: string;
  }): Promise<MembershipRecord | undefined>;

  abstract listMemberships(input: {
    afterUserId?: string;
    limit: number;
    organizationId: string;
  }): Promise<MembershipRecord[]>;

  abstract updateMembership(input: {
    expectedRole?: OrganizationRole;
    organizationId: string;
    role?: OrganizationRole;
    status?: MembershipRecord['status'];
    userId: string;
  }): Promise<MembershipRecord>;

  abstract createInvitation(
    invitation: OrganizationInvitation,
  ): Promise<OrganizationInvitation>;

  abstract findInvitation(input: {
    id: string;
    organizationId: string;
  }): Promise<OrganizationInvitation | undefined>;

  abstract findInvitationByRecipient(input: {
    emailAddress: string;
    organizationId: string;
  }): Promise<OrganizationInvitation | undefined>;

  abstract findInvitationByExternalId(
    externalId: string,
  ): Promise<OrganizationInvitation | undefined>;

  abstract findAcceptedInvitation(input: {
    externalId: string;
    userId: string;
  }): Promise<AcceptedInvitationResult | undefined>;

  abstract acceptInvitation(input: {
    invitationId: string;
    organizationId: string;
    role: OrganizationRole;
    userId: string;
  }): Promise<{
    membership: { role: OrganizationRole };
    organization: { id: string; slug: string };
  }>;

  abstract listInvitations(
    organizationId: string,
  ): Promise<OrganizationInvitation[]>;

  abstract updateInvitation(
    invitation: OrganizationInvitation,
  ): Promise<OrganizationInvitation>;

  abstract claimInvitationForResend(input: {
    claimExternalId: string;
    expectedExternalId: string;
    expectedStatus: OrganizationInvitation['status'];
    invitationId: string;
    organizationId: string;
  }): Promise<boolean>;

  abstract claimOnboarding(input: {
    idempotencyKey: string;
    requestHash: string;
    userId: string;
  }): Promise<OrganizationOnboardingClaim>;

  abstract completeOnboarding(
    record: CompleteFirstOrganizationRecord,
  ): Promise<void>;

  abstract findOnboarding(
    userId: string,
  ): Promise<OrganizationOnboardingResult | undefined>;

  abstract getSettings(organizationId: string): Promise<OrganizationProfile>;

  abstract releaseOnboarding(input: {
    idempotencyKey: string;
    userId: string;
  }): Promise<void>;

  abstract updateSettings(input: {
    locale: string;
    organizationId: string;
    timeZone: string;
  }): Promise<OrganizationProfile>;
}

export interface OrganizationRecord extends OrganizationProfile {
  state: OrganizationAccessState;
}

export interface OrganizationInvitation {
  acceptedByUserId?: string;
  emailAddress: string;
  expiresAt: Date;
  externalId: string;
  id: string;
  invitedByUserId: string;
  organizationId: string;
  role: OrganizationRole;
  status: 'accepted' | 'pending' | 'revoked';
}

export abstract class OrganizationDirectory {
  abstract create(input: {
    name: string;
    slug: string;
    userId: string;
  }): Promise<{ id: string }>;

  abstract delete(organizationId: string): Promise<void>;

  abstract createInvitation(input: {
    emailAddress: string;
    inviterUserId: string;
    organizationId: string;
    role: OrganizationRole;
  }): Promise<{ expiresAt: Date; externalId: string }>;

  abstract revokeInvitation(input: {
    externalId: string;
    organizationId: string;
    requestingUserId: string;
  }): Promise<void>;

  abstract findAcceptedMembership(input: {
    externalId: string;
    organizationId: string;
    userId: string;
  }): Promise<{ role: OrganizationRole } | undefined>;

  abstract updateMembershipRole(input: {
    organizationId: string;
    role: OrganizationRole;
    userId: string;
  }): Promise<void>;

  abstract deleteMembership(input: {
    organizationId: string;
    userId: string;
  }): Promise<void>;
}

export class OrganizationSlugConflictError extends Error {}
export class InvitationStateConflictError extends Error {}
export class LastOwnerRequiredError extends Error {}
export class MembershipStateConflictError extends Error {}
