import { PrismaPg } from '@prisma/adapter-pg';
import { type OnModuleDestroy } from '@nestjs/common';
import {
  InvitationStatus,
  MembershipRole,
  MembershipStatus,
  OnboardingStatus,
  OrganizationState,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import {
  OrganizationRepository,
  InvitationStateConflictError,
  OrganizationSlugConflictError,
  type CompleteFirstOrganizationRecord,
  type OrganizationOnboardingClaim,
  type OrganizationOnboardingResult,
  type OrganizationInvitation,
} from './organization.js';

export class PrismaOrganizationRepository
  extends OrganizationRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async createInvitation(invitation: OrganizationInvitation) {
    try {
      const created = await this.client.invitation.create({
        data: {
          id: invitation.id,
          organizationId: invitation.organizationId,
          emailAddress: invitation.emailAddress,
          role: this.membershipRole(invitation.role),
          status: InvitationStatus.PENDING,
          externalId: invitation.externalId,
          invitedByUserId: invitation.invitedByUserId,
          expiresAt: invitation.expiresAt,
        },
      });
      return this.toInvitation(created);
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw new InvitationStateConflictError();
      throw error;
    }
  }

  async findInvitation(input: { id: string; organizationId: string }) {
    const invitation = await this.client.invitation.findFirst({
      where: input,
    });
    return invitation ? this.toInvitation(invitation) : undefined;
  }

  async findInvitationByRecipient(input: {
    emailAddress: string;
    organizationId: string;
  }) {
    const invitation = await this.client.invitation.findUnique({
      where: { organizationId_emailAddress: input },
    });
    return invitation ? this.toInvitation(invitation) : undefined;
  }

  async findInvitationByExternalId(externalId: string) {
    const invitation = await this.client.invitation.findUnique({
      where: { externalId },
    });
    return invitation ? this.toInvitation(invitation) : undefined;
  }

  async findAcceptedInvitation(input: { externalId: string; userId: string }) {
    const invitation = await this.client.invitation.findFirst({
      where: {
        externalId: input.externalId,
        acceptedByUserId: input.userId,
        status: InvitationStatus.ACCEPTED,
      },
      include: { organization: { select: { id: true, slug: true } } },
    });
    return invitation
      ? {
          organization: invitation.organization,
          membership: { role: this.organizationRole(invitation.role) },
        }
      : undefined;
  }

  async acceptInvitation(input: {
    invitationId: string;
    organizationId: string;
    role: 'admin' | 'member' | 'owner';
    userId: string;
  }) {
    return this.client.$transaction(async (transaction) => {
      const accepted = await transaction.invitation.updateMany({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          acceptedByUserId: input.userId,
          status: InvitationStatus.ACCEPTED,
        },
      });
      if (accepted.count !== 1) throw new InvitationStateConflictError();

      await transaction.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
        create: {
          organizationId: input.organizationId,
          userId: input.userId,
          role: this.membershipRole(input.role),
          status: MembershipStatus.ACTIVE,
        },
        update: {
          role: this.membershipRole(input.role),
          status: MembershipStatus.ACTIVE,
        },
      });
      const organization = await transaction.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: { id: true, slug: true },
      });
      return { organization, membership: { role: input.role } };
    });
  }

  async listInvitations(organizationId: string) {
    const invitations = await this.client.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map((invitation) => this.toInvitation(invitation));
  }

  async updateInvitation(invitation: OrganizationInvitation) {
    const updated = await this.client.invitation.update({
      where: { id: invitation.id },
      data: {
        externalId: invitation.externalId,
        expiresAt: invitation.expiresAt,
        invitedByUserId: invitation.invitedByUserId,
        role: this.membershipRole(invitation.role),
        status: {
          accepted: InvitationStatus.ACCEPTED,
          pending: InvitationStatus.PENDING,
          revoked: InvitationStatus.REVOKED,
        }[invitation.status],
      },
    });
    return this.toInvitation(updated);
  }

  async claimInvitationForResend(input: {
    claimExternalId: string;
    expectedExternalId: string;
    expectedStatus: OrganizationInvitation['status'];
    invitationId: string;
    organizationId: string;
  }) {
    const claimed = await this.client.invitation.updateMany({
      where: {
        id: input.invitationId,
        organizationId: input.organizationId,
        externalId: input.expectedExternalId,
        status: {
          accepted: InvitationStatus.ACCEPTED,
          pending: InvitationStatus.PENDING,
          revoked: InvitationStatus.REVOKED,
        }[input.expectedStatus],
      },
      data: {
        externalId: input.claimExternalId,
        status: InvitationStatus.REVOKED,
      },
    });
    return claimed.count === 1;
  }

  async claimOnboarding(input: {
    idempotencyKey: string;
    requestHash: string;
    userId: string;
  }): Promise<OrganizationOnboardingClaim> {
    const existing = await this.client.organizationOnboardingRequest.findUnique(
      { where: { userId: input.userId } },
    );
    if (existing) return this.resolveClaim(existing, input);

    const membership = await this.client.membership.findFirst({
      where: { userId: input.userId },
      select: { id: true },
    });
    if (membership) return { status: 'already-complete' };

    try {
      await this.client.organizationOnboardingRequest.create({ data: input });
      return { status: 'claimed' };
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const concurrent =
        await this.client.organizationOnboardingRequest.findUniqueOrThrow({
          where: { userId: input.userId },
        });
      return this.resolveClaim(concurrent, input);
    }
  }

  async completeOnboarding(record: CompleteFirstOrganizationRecord) {
    try {
      await this.client.$transaction(async (transaction) => {
        await transaction.organization.create({
          data: {
            ...record.organization,
            memberships: {
              create: {
                userId: record.userId,
                role: MembershipRole.OWNER,
                status: MembershipStatus.ACTIVE,
              },
            },
          },
        });
        const completed =
          await transaction.organizationOnboardingRequest.updateMany({
            where: {
              userId: record.userId,
              idempotencyKey: record.idempotencyKey,
              requestHash: record.requestHash,
              status: OnboardingStatus.PROCESSING,
            },
            data: {
              organizationId: record.organization.id,
              status: OnboardingStatus.COMPLETED,
            },
          });

        if (completed.count !== 1) {
          throw new Error('Organization onboarding claim is unavailable.');
        }
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new OrganizationSlugConflictError();
      }
      throw error;
    }
  }

  async findOnboarding(
    userId: string,
  ): Promise<OrganizationOnboardingResult | undefined> {
    const request = await this.client.organizationOnboardingRequest.findUnique({
      where: { userId, status: OnboardingStatus.COMPLETED },
      include: {
        organization: {
          include: {
            memberships: {
              where: { userId, status: MembershipStatus.ACTIVE },
              select: { role: true },
            },
          },
        },
      },
    });
    const organization = request?.organization;
    const membership = organization?.memberships[0];
    if (!organization || membership?.role !== MembershipRole.OWNER) {
      return undefined;
    }

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        locale: organization.locale,
        timeZone: organization.timeZone,
      },
      membership: { role: 'owner' },
    };
  }

  async releaseOnboarding(input: { idempotencyKey: string; userId: string }) {
    await this.client.organizationOnboardingRequest.deleteMany({
      where: {
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
        status: OnboardingStatus.PROCESSING,
      },
    });
  }

  async findMembership(input: { organizationId: string; userId: string }) {
    const membership = await this.client.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      select: { status: true },
    });
    if (!membership) return undefined;

    return {
      status:
        membership.status === MembershipStatus.ACTIVE
          ? ('active' as const)
          : ('suspended' as const),
    };
  }

  async findOrganization(organizationId: string) {
    const organization = await this.client.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, state: true },
    });
    if (!organization) return undefined;

    const states = {
      [OrganizationState.ACTIVE]: 'active',
      [OrganizationState.READ_ONLY]: 'read-only',
      [OrganizationState.PENDING_DELETION]: 'pending-deletion',
    } as const;
    return { state: states[organization.state] };
  }

  async getSettings(organizationId: string) {
    return this.client.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        locale: true,
        timeZone: true,
      },
    });
  }

  async updateSettings(input: {
    locale: string;
    organizationId: string;
    timeZone: string;
  }) {
    return this.client.organization.update({
      where: { id: input.organizationId },
      data: { locale: input.locale, timeZone: input.timeZone },
      select: {
        id: true,
        name: true,
        slug: true,
        locale: true,
        timeZone: true,
      },
    });
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  private async resolveClaim(
    request: {
      idempotencyKey: string;
      requestHash: string;
      status: OnboardingStatus;
    },
    input: { idempotencyKey: string; requestHash: string; userId: string },
  ): Promise<OrganizationOnboardingClaim> {
    if (request.idempotencyKey !== input.idempotencyKey) {
      return request.status === OnboardingStatus.COMPLETED
        ? { status: 'already-complete' }
        : { status: 'in-progress' };
    }
    if (request.requestHash !== input.requestHash) {
      return { status: 'conflict' };
    }
    if (request.status === OnboardingStatus.PROCESSING) {
      return { status: 'in-progress' };
    }

    const result = await this.findOnboarding(input.userId);
    if (!result)
      throw new Error('Completed Organization onboarding is invalid.');
    return { status: 'replay', result };
  }

  private isUniqueConflict(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private membershipRole(role: 'admin' | 'member' | 'owner') {
    return {
      admin: MembershipRole.ADMIN,
      member: MembershipRole.MEMBER,
      owner: MembershipRole.OWNER,
    }[role];
  }

  private organizationRole(role: MembershipRole) {
    return role.toLowerCase() as 'admin' | 'member' | 'owner';
  }

  private toInvitation(invitation: {
    acceptedByUserId: string | null;
    emailAddress: string;
    expiresAt: Date;
    externalId: string;
    id: string;
    invitedByUserId: string;
    organizationId: string;
    role: MembershipRole;
    status: InvitationStatus;
  }): OrganizationInvitation {
    return {
      ...invitation,
      acceptedByUserId: invitation.acceptedByUserId ?? undefined,
      role: this.organizationRole(invitation.role),
      status: invitation.status.toLowerCase() as
        'accepted' | 'pending' | 'revoked',
    };
  }
}
