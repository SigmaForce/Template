import {
  AuthorizationRepository,
  type OrganizationAccessState,
} from '../authorization/authorization.js';

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

export abstract class OrganizationDirectory {
  abstract create(input: {
    name: string;
    slug: string;
    userId: string;
  }): Promise<{ id: string }>;

  abstract delete(organizationId: string): Promise<void>;
}

export class OrganizationSlugConflictError extends Error {}
