import {
  OrganizationDirectory,
  OrganizationRepository,
  OrganizationSlugConflictError,
  type CompleteFirstOrganizationRecord,
  type OrganizationOnboardingClaim,
  type OrganizationOnboardingResult,
  type OrganizationRecord,
} from './organization.js';
import type {
  MembershipAccess,
  MembershipIdentity,
  MembershipAccessStatus,
} from '../authorization/authorization.js';

interface MemoryMembership extends MembershipAccess {
  organizationId: string;
  userId: string;
}

export interface MemoryOrganizationRepositorySeed {
  memberships?: Array<{
    organizationId: string;
    status: MembershipAccessStatus;
    userId: string;
  }>;
  organizations?: OrganizationRecord[];
}

export class MemoryOrganizationRepository extends OrganizationRepository {
  private readonly onboarding = new Map<string, OrganizationOnboardingResult>();
  private readonly requests = new Map<
    string,
    {
      idempotencyKey: string;
      requestHash: string;
      result?: OrganizationOnboardingResult;
    }
  >();
  private readonly organizations = new Map<string, OrganizationRecord>();
  private readonly memberships = new Map<string, MemoryMembership>();

  constructor(seed: MemoryOrganizationRepositorySeed = {}) {
    super();
    for (const organization of seed.organizations ?? []) {
      this.organizations.set(organization.id, { ...organization });
    }
    for (const membership of seed.memberships ?? []) {
      this.memberships.set(this.membershipKey(membership), { ...membership });
    }
  }

  async claimOnboarding(input: {
    idempotencyKey: string;
    requestHash: string;
    userId: string;
  }): Promise<OrganizationOnboardingClaim> {
    const request = this.requests.get(input.userId);
    if (!request) {
      if (this.onboarding.has(input.userId)) {
        return { status: 'already-complete' };
      }
      this.requests.set(input.userId, input);
      return { status: 'claimed' };
    }

    if (request.idempotencyKey !== input.idempotencyKey) {
      return request.result
        ? { status: 'already-complete' }
        : { status: 'in-progress' };
    }
    if (request.requestHash !== input.requestHash) {
      return { status: 'conflict' };
    }
    return request.result
      ? { status: 'replay', result: request.result }
      : { status: 'in-progress' };
  }

  async completeOnboarding(record: CompleteFirstOrganizationRecord) {
    const result = {
      organization: record.organization,
      membership: { role: 'owner' as const },
    };
    this.onboarding.set(record.userId, result);
    this.organizations.set(record.organization.id, {
      ...record.organization,
      state: 'active',
    });
    this.memberships.set(
      this.membershipKey({
        organizationId: record.organization.id,
        userId: record.userId,
      }),
      {
        organizationId: record.organization.id,
        userId: record.userId,
        status: 'active',
      },
    );
    this.requests.set(record.userId, {
      idempotencyKey: record.idempotencyKey,
      requestHash: record.requestHash,
      result,
    });
  }

  async findOnboarding(userId: string) {
    return this.onboarding.get(userId);
  }

  async releaseOnboarding(input: { idempotencyKey: string; userId: string }) {
    const request = this.requests.get(input.userId);
    if (request?.idempotencyKey === input.idempotencyKey && !request.result) {
      this.requests.delete(input.userId);
    }
  }

  async findMembership(input: MembershipIdentity) {
    return this.memberships.get(this.membershipKey(input));
  }

  async findOrganization(organizationId: string) {
    const organization = this.organizations.get(organizationId);
    return organization ? { state: organization.state } : undefined;
  }

  async getSettings(organizationId: string) {
    const organization = this.organizations.get(organizationId);
    if (!organization) throw new Error('Organization is unavailable.');
    const { state: _state, ...profile } = organization;
    return profile;
  }

  async updateSettings(input: {
    locale: string;
    organizationId: string;
    timeZone: string;
  }) {
    const organization = this.organizations.get(input.organizationId);
    if (!organization) throw new Error('Organization is unavailable.');
    const updated = {
      ...organization,
      locale: input.locale,
      timeZone: input.timeZone,
    };
    this.organizations.set(input.organizationId, updated);
    const { state: _state, ...profile } = updated;
    return profile;
  }

  private membershipKey(input: MembershipIdentity) {
    return `${input.organizationId}\u0000${input.userId}`;
  }
}

export class MemoryOrganizationDirectory extends OrganizationDirectory {
  private readonly organizationsBySlug = new Map<string, string>();

  async create(input: { name: string; slug: string; userId: string }) {
    if (this.organizationsBySlug.has(input.slug)) {
      throw new OrganizationSlugConflictError();
    }

    const id = `org_${input.slug.replaceAll('-', '_')}`;
    this.organizationsBySlug.set(input.slug, id);
    return { id };
  }

  async delete(organizationId: string) {
    for (const [slug, id] of this.organizationsBySlug) {
      if (id === organizationId) this.organizationsBySlug.delete(slug);
    }
  }
}
