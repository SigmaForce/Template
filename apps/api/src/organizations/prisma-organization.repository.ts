import { PrismaPg } from '@prisma/adapter-pg';
import { type OnModuleDestroy } from '@nestjs/common';
import {
  MembershipRole,
  MembershipStatus,
  OnboardingStatus,
  OrganizationState,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import {
  OrganizationRepository,
  OrganizationSlugConflictError,
  type CompleteFirstOrganizationRecord,
  type OrganizationOnboardingClaim,
  type OrganizationOnboardingResult,
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
      select: { role: true, status: true },
    });
    if (!membership) return undefined;

    return {
      role: membership.role.toLowerCase() as 'admin' | 'member' | 'owner',
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
    return { id: organization.id, state: states[organization.state] };
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
}
