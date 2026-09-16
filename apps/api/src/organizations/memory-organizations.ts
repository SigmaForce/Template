import {
  OrganizationDirectory,
  OrganizationRepository,
  OrganizationSlugConflictError,
  type CompleteFirstOrganizationRecord,
  type OrganizationOnboardingClaim,
  type OrganizationOnboardingResult,
} from './organization.js';

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
