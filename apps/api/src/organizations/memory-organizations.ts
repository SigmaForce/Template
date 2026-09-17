import {
  OrganizationDirectory,
  InvitationStateConflictError,
  OrganizationRepository,
  OrganizationSlugConflictError,
  LastOwnerRequiredError,
  MembershipStateConflictError,
  type CompleteFirstOrganizationRecord,
  type OrganizationOnboardingClaim,
  type OrganizationOnboardingResult,
  type OrganizationInvitation,
  type OrganizationRecord,
} from './organization.js';
import type {
  MembershipAccess,
  MembershipIdentity,
  MembershipAccessStatus,
} from '../authorization/authorization.js';
import type { OrganizationRole } from '../authorization/permission.js';

interface MemoryMembership extends MembershipAccess {
  organizationId: string;
  role?: OrganizationRole;
  userId: string;
}

export interface MemoryOrganizationRepositorySeed {
  memberships?: Array<{
    organizationId: string;
    role?: OrganizationRole;
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
  private readonly invitations = new Map<string, OrganizationInvitation>();

  constructor(seed: MemoryOrganizationRepositorySeed = {}) {
    super();
    for (const organization of seed.organizations ?? []) {
      this.organizations.set(organization.id, { ...organization });
    }
    for (const membership of seed.memberships ?? []) {
      this.memberships.set(this.membershipKey(membership), { ...membership });
    }
  }

  async findMembershipRecord(input: MembershipIdentity) {
    const membership = this.memberships.get(this.membershipKey(input));
    return membership?.role
      ? { ...membership, role: membership.role }
      : undefined;
  }

  async listMemberships(input: {
    afterUserId?: string;
    limit: number;
    organizationId: string;
  }) {
    return [...this.memberships.values()]
      .filter(
        (
          membership,
        ): membership is MemoryMembership & { role: OrganizationRole } =>
          membership.organizationId === input.organizationId &&
          Boolean(membership.role) &&
          (!input.afterUserId || membership.userId > input.afterUserId),
      )
      .sort((left, right) =>
        left.userId < right.userId ? -1 : left.userId > right.userId ? 1 : 0,
      )
      .slice(0, input.limit);
  }

  async updateMembership(input: {
    expectedRole?: OrganizationRole;
    organizationId: string;
    role?: OrganizationRole;
    status?: 'active' | 'removed' | 'suspended';
    userId: string;
  }) {
    const membership = await this.findMembershipRecord(input);
    if (!membership) throw new MembershipStateConflictError();
    if (input.expectedRole && membership.role !== input.expectedRole) {
      throw new MembershipStateConflictError();
    }
    const role = input.role ?? membership.role;
    const status = input.status ?? membership.status;
    if (
      membership.role === 'owner' &&
      membership.status === 'active' &&
      (role !== 'owner' || status !== 'active') &&
      [...this.memberships.values()].filter(
        (candidate) =>
          candidate.organizationId === input.organizationId &&
          candidate.role === 'owner' &&
          candidate.status === 'active',
      ).length <= 1
    ) {
      throw new LastOwnerRequiredError();
    }
    const updated = { ...membership, role, status };
    this.memberships.set(this.membershipKey(input), updated);
    return updated;
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

  async createInvitation(invitation: OrganizationInvitation) {
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  async findInvitation(input: { id: string; organizationId: string }) {
    const invitation = this.invitations.get(input.id);
    return invitation?.organizationId === input.organizationId
      ? invitation
      : undefined;
  }

  async findInvitationByRecipient(input: {
    emailAddress: string;
    organizationId: string;
  }) {
    return [...this.invitations.values()].find(
      (invitation) =>
        invitation.organizationId === input.organizationId &&
        invitation.emailAddress === input.emailAddress,
    );
  }

  async findInvitationByExternalId(externalId: string) {
    return [...this.invitations.values()].find(
      (invitation) => invitation.externalId === externalId,
    );
  }

  async findAcceptedInvitation(input: { externalId: string; userId: string }) {
    const invitation = await this.findInvitationByExternalId(input.externalId);
    const organization = invitation
      ? this.organizations.get(invitation.organizationId)
      : undefined;
    return invitation?.status === 'accepted' &&
      invitation.acceptedByUserId === input.userId &&
      organization
      ? {
          organization: { id: organization.id, slug: organization.slug },
          membership: { role: invitation.role },
        }
      : undefined;
  }

  async acceptInvitation(input: {
    invitationId: string;
    organizationId: string;
    role: 'admin' | 'member' | 'owner';
    userId: string;
  }) {
    const invitation = this.invitations.get(input.invitationId);
    const organization = this.organizations.get(input.organizationId);
    if (
      !invitation ||
      invitation.status !== 'pending' ||
      invitation.expiresAt.getTime() <= Date.now() ||
      !organization
    ) {
      throw new InvitationStateConflictError();
    }
    invitation.status = 'accepted';
    invitation.acceptedByUserId = input.userId;
    this.memberships.set(this.membershipKey(input), {
      organizationId: input.organizationId,
      role: input.role,
      userId: input.userId,
      status: 'active',
    });
    return {
      organization: { id: organization.id, slug: organization.slug },
      membership: { role: input.role },
    };
  }

  async listInvitations(organizationId: string) {
    return [...this.invitations.values()].filter(
      (invitation) => invitation.organizationId === organizationId,
    );
  }

  async updateInvitation(invitation: OrganizationInvitation) {
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  async claimInvitationForResend(input: {
    claimExternalId: string;
    expectedExternalId: string;
    expectedStatus: OrganizationInvitation['status'];
    invitationId: string;
    organizationId: string;
  }) {
    const invitation = this.invitations.get(input.invitationId);
    if (
      !invitation ||
      invitation.organizationId !== input.organizationId ||
      invitation.externalId !== input.expectedExternalId ||
      invitation.status !== input.expectedStatus
    ) {
      return false;
    }
    this.invitations.set(invitation.id, {
      ...invitation,
      externalId: input.claimExternalId,
      status: 'revoked',
    });
    return true;
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
        role: 'owner',
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
  private readonly invitations = new Map<
    string,
    {
      acceptedByUserId?: string;
      emailAddress: string;
      expiresAt: Date;
      organizationId: string;
      role: 'admin' | 'member' | 'owner';
      status: 'accepted' | 'pending' | 'revoked';
    }
  >();

  constructor(
    private readonly options: { invitationLifetimeMs?: number } = {},
  ) {
    super();
  }

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

  async createInvitation(input: {
    emailAddress: string;
    organizationId: string;
    role: 'admin' | 'member' | 'owner';
  }) {
    const externalId = `orginv_${crypto.randomUUID()}`;
    const expiresAt = new Date(
      Date.now() +
        (this.options.invitationLifetimeMs ?? 7 * 24 * 60 * 60 * 1000),
    );
    this.invitations.set(externalId, {
      emailAddress: input.emailAddress,
      expiresAt,
      organizationId: input.organizationId,
      role: input.role,
      status: 'pending',
    });
    return {
      externalId,
      expiresAt,
    };
  }

  async revokeInvitation(input: { externalId: string }) {
    const invitation = this.invitations.get(input.externalId);
    if (invitation) invitation.status = 'revoked';
  }

  acceptInvitation(input: { emailAddress: string; userId: string }) {
    const entry = [...this.invitations.entries()].find(
      ([, invitation]) =>
        invitation.emailAddress === input.emailAddress &&
        invitation.status === 'pending' &&
        invitation.expiresAt.getTime() > Date.now(),
    );
    if (!entry) throw new Error('Invitation is unavailable.');
    const [externalId, invitation] = entry;
    invitation.status = 'accepted';
    invitation.acceptedByUserId = input.userId;
    return externalId;
  }

  invitationIdFor(emailAddress: string) {
    const entry = [...this.invitations.entries()].find(
      ([, invitation]) => invitation.emailAddress === emailAddress,
    );
    if (!entry) throw new Error('Invitation is unavailable.');
    return entry[0];
  }

  activeInvitationCountFor(emailAddress: string) {
    return [...this.invitations.values()].filter(
      (invitation) =>
        invitation.emailAddress === emailAddress &&
        invitation.status === 'pending' &&
        invitation.expiresAt.getTime() > Date.now(),
    ).length;
  }

  async findAcceptedMembership(input: {
    externalId: string;
    organizationId: string;
    userId: string;
  }) {
    const invitation = this.invitations.get(input.externalId);
    return invitation?.organizationId === input.organizationId &&
      invitation.status === 'accepted' &&
      invitation.acceptedByUserId === input.userId
      ? { role: invitation.role }
      : undefined;
  }

  async updateMembershipRole(_input: {
    organizationId: string;
    role: OrganizationRole;
    userId: string;
  }) {}

  async deleteMembership(_input: { organizationId: string; userId: string }) {}
}
