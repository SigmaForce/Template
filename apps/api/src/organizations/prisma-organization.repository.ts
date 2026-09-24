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
  LastOwnerRequiredError,
  MembershipStateConflictError,
  SeatAllowanceExceededError,
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

  async findMembershipRecord(input: {
    organizationId: string;
    userId: string;
  }) {
    const membership = await this.client.membership.findUnique({
      where: { organizationId_userId: input },
    });
    return membership ? this.toMembership(membership) : undefined;
  }

  async listMemberships(input: {
    afterUserId?: string;
    limit: number;
    organizationId: string;
  }) {
    const memberships = await this.client.membership.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.afterUserId ? { gt: input.afterUserId } : undefined,
      },
      orderBy: { userId: 'asc' },
      take: input.limit,
    });
    return memberships.map((membership) => this.toMembership(membership));
  }

  async updateMembership(input: {
    expectedRole?: 'admin' | 'member' | 'owner';
    organizationId: string;
    role?: 'admin' | 'member' | 'owner';
    seatAllowance?: number;
    status?: 'active' | 'removed' | 'suspended';
    userId: string;
  }) {
    try {
      return await this.client.$transaction(
        async (transaction) => {
          if (input.status === 'active') {
            await this.lockSeatAllocation(transaction, input.organizationId);
          }
          const where = {
            organizationId_userId: {
              organizationId: input.organizationId,
              userId: input.userId,
            },
          };
          const membership = await transaction.membership.findUnique({ where });
          if (!membership) throw new MembershipStateConflictError();
          if (
            input.expectedRole &&
            this.organizationRole(membership.role) !== input.expectedRole
          ) {
            throw new MembershipStateConflictError();
          }
          const role = input.role
            ? this.membershipRole(input.role)
            : membership.role;
          const status = input.status
            ? {
                active: MembershipStatus.ACTIVE,
                removed: MembershipStatus.REMOVED,
                suspended: MembershipStatus.SUSPENDED,
              }[input.status]
            : membership.status;
          if (
            status === MembershipStatus.ACTIVE &&
            (await this.seatAllowanceExceeded(
              transaction,
              input.organizationId,
              membership.status,
              input.seatAllowance,
            ))
          ) {
            throw new SeatAllowanceExceededError();
          }
          if (
            membership.role === MembershipRole.OWNER &&
            membership.status === MembershipStatus.ACTIVE &&
            (role !== MembershipRole.OWNER ||
              status !== MembershipStatus.ACTIVE) &&
            (await transaction.membership.count({
              where: {
                organizationId: input.organizationId,
                role: MembershipRole.OWNER,
                status: MembershipStatus.ACTIVE,
              },
            })) <= 1
          ) {
            throw new LastOwnerRequiredError();
          }
          return this.toMembership(
            await transaction.membership.update({
              where,
              data: { role, status },
            }),
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new MembershipStateConflictError();
      }
      throw error;
    }
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
    seatAllowance?: number;
    userId: string;
  }) {
    const outcome = await this.client.$transaction(async (transaction) => {
      await this.lockSeatAllocation(transaction, input.organizationId);
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

      const currentMembership = await transaction.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
      });
      const seatAllowanceExceeded = await this.seatAllowanceExceeded(
        transaction,
        input.organizationId,
        currentMembership?.status,
        input.seatAllowance,
      );
      if (seatAllowanceExceeded) {
        await transaction.invitation.update({
          where: { id: input.invitationId },
          data: {
            acceptedByUserId: null,
            status: InvitationStatus.PENDING,
          },
        });
      } else {
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
      }
      const organization = await transaction.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: { id: true, slug: true },
      });
      return {
        organization,
        membership: { role: input.role },
        seatAllowanceExceeded,
      };
    });
    if (outcome.seatAllowanceExceeded) {
      throw new SeatAllowanceExceededError();
    }
    return {
      organization: outcome.organization,
      membership: outcome.membership,
    };
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
            slugs: { create: { slug: record.organization.slug } },
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
        billingContactEmail: organization.billingContactEmail,
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
      select: { role: true, status: true },
    });
    if (!membership) return undefined;

    return {
      role: this.organizationRole(membership.role),
      status: this.membershipStatus(membership.status),
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
        billingContactEmail: true,
        id: true,
        name: true,
        slug: true,
        locale: true,
        timeZone: true,
      },
    });
  }

  async resolveSlug(slug: string) {
    const reservation = await this.client.organizationSlug.findUnique({
      where: { slug },
      select: {
        organization: { select: { id: true, slug: true } },
      },
    });
    return reservation?.organization;
  }

  async updateSettings(input: {
    billingContactEmail?: string | null;
    locale?: string;
    name?: string;
    organizationId: string;
    slug?: string;
    timeZone?: string;
  }) {
    try {
      return await this.client.$transaction(async (transaction) => {
        if (input.slug) {
          const reservation = await transaction.organizationSlug.findUnique({
            where: { slug: input.slug },
            select: { organizationId: true },
          });
          if (reservation?.organizationId !== input.organizationId) {
            if (reservation) throw new OrganizationSlugConflictError();
            await transaction.organizationSlug.create({
              data: {
                organizationId: input.organizationId,
                slug: input.slug,
              },
            });
          }
        }

        return transaction.organization.update({
          where: { id: input.organizationId },
          data: {
            billingContactEmail: input.billingContactEmail,
            locale: input.locale,
            name: input.name,
            slug: input.slug,
            timeZone: input.timeZone,
          },
          select: {
            billingContactEmail: true,
            id: true,
            name: true,
            slug: true,
            locale: true,
            timeZone: true,
          },
        });
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new OrganizationSlugConflictError();
      }
      throw error;
    }
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

  private async lockSeatAllocation(
    transaction: Prisma.TransactionClient,
    organizationId: string,
  ) {
    // ponytail: serialize Seat changes per Organization; split the lock only if contention is measured.
    await transaction.$queryRaw`
      SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE
    `;
  }

  private async seatAllowanceExceeded(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    currentStatus: MembershipStatus | undefined,
    seatAllowance: number | undefined,
  ) {
    return (
      currentStatus !== MembershipStatus.ACTIVE &&
      seatAllowance !== undefined &&
      (await transaction.membership.count({
        where: {
          organizationId,
          status: MembershipStatus.ACTIVE,
        },
      })) >= seatAllowance
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

  private membershipStatus(status: MembershipStatus) {
    return status === MembershipStatus.ACTIVE
      ? ('active' as const)
      : status === MembershipStatus.SUSPENDED
        ? ('suspended' as const)
        : ('removed' as const);
  }

  private toMembership(membership: {
    organizationId: string;
    role: MembershipRole;
    status: MembershipStatus;
    userId: string;
  }) {
    return {
      organizationId: membership.organizationId,
      role: this.organizationRole(membership.role),
      status: this.membershipStatus(membership.status),
      userId: membership.userId,
    };
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
