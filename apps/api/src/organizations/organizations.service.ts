import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import type { CreateOrganizationDto } from './create-organization.dto.js';
import { PublicProblemException } from '../http/problem-details.js';
import {
  OrganizationDirectory,
  OrganizationRepository,
  InvitationStateConflictError,
  type OrganizationOnboardingResult,
  OrganizationSlugConflictError,
  SeatAllowanceExceededError,
  SeatAllowancePolicy,
} from './organization.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Capability } from '../authorization/authorization.js';
import { Permission } from '../authorization/permission.js';
import type { UpdateOrganizationSettingsDto } from './update-organization-settings.dto.js';
import type { CreateInvitationDto } from './create-invitation.dto.js';
import type { OrganizationInvitation } from './organization.js';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly directory: OrganizationDirectory,
    private readonly authorization: AuthorizationService,
    private readonly seats: SeatAllowancePolicy,
  ) {}

  async createFirstOrganization(
    user: AuthenticatedUser,
    idempotencyKey: string,
    input: CreateOrganizationDto,
  ): Promise<OrganizationOnboardingResult> {
    const requestHash = createHash('sha256')
      .update(
        [input.name, input.slug, input.locale, input.timeZone].join('\u0000'),
      )
      .digest('hex');
    const claim = await this.repository.claimOnboarding({
      idempotencyKey,
      requestHash,
      userId: user.id,
    });

    if (claim.status === 'replay') return claim.result;
    if (claim.status === 'conflict') {
      throw PublicProblemException.idempotencyConflict();
    }
    if (claim.status === 'in-progress') {
      throw PublicProblemException.organizationOnboardingInProgress();
    }
    if (claim.status === 'already-complete') {
      throw PublicProblemException.organizationAlreadyExists();
    }

    let directoryOrganization: { id: string };
    try {
      directoryOrganization = await this.directory.create({
        name: input.name,
        slug: input.slug,
        userId: user.id,
      });
    } catch (error) {
      await this.repository.releaseOnboarding({
        idempotencyKey,
        userId: user.id,
      });
      if (error instanceof OrganizationSlugConflictError) {
        throw PublicProblemException.organizationSlugConflict();
      }
      throw error;
    }
    const result = {
      organization: {
        billingContactEmail: null,
        id: directoryOrganization.id,
        ...input,
      },
      membership: { role: 'owner' as const },
    };

    try {
      await this.repository.completeOnboarding({
        idempotencyKey,
        organization: result.organization,
        requestHash,
        userId: user.id,
      });
    } catch (error) {
      await Promise.allSettled([
        this.directory.delete(directoryOrganization.id),
        this.repository.releaseOnboarding({
          idempotencyKey,
          userId: user.id,
        }),
      ]);
      if (error instanceof OrganizationSlugConflictError) {
        throw PublicProblemException.organizationSlugConflict();
      }
      throw error;
    }

    return result;
  }

  async createInvitation(
    user: AuthenticatedUser,
    organizationId: string,
    input: CreateInvitationDto,
  ) {
    const scope = await this.authorization.authorize({
      user,
      targetOrganizationId: organizationId,
      capability: Capability.organizationMemberships,
      permission: Permission.organizationMembershipsManage,
    });
    if (scope.role === 'admin' && input.role === 'owner') {
      throw PublicProblemException.permissionDenied();
    }

    const existing = await this.repository.findInvitationByRecipient({
      organizationId: scope.organizationId,
      emailAddress: input.emailAddress,
    });
    if (existing) {
      if (
        existing.status !== 'pending' ||
        existing.expiresAt.getTime() <= Date.now()
      ) {
        throw PublicProblemException.invitationUnavailable();
      }
      if (existing.role !== input.role) {
        throw PublicProblemException.invitationUnavailable();
      }
      return this.publicInvitation(existing);
    }

    const external = await this.directory.createInvitation({
      organizationId: scope.organizationId,
      emailAddress: input.emailAddress,
      inviterUserId: user.id,
      role: input.role,
    });
    try {
      const invitation = await this.repository.createInvitation({
        id: randomUUID(),
        organizationId: scope.organizationId,
        emailAddress: input.emailAddress,
        role: input.role,
        status: 'pending',
        invitedByUserId: user.id,
        externalId: external.externalId,
        expiresAt: external.expiresAt,
      });
      return this.publicInvitation(invitation);
    } catch (error) {
      await this.directory.revokeInvitation({
        organizationId: scope.organizationId,
        externalId: external.externalId,
        requestingUserId: user.id,
      });
      if (error instanceof InvitationStateConflictError) {
        throw PublicProblemException.invitationUnavailable();
      }
      throw error;
    }
  }

  async listInvitations(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorizeInvitationManagement(
      user,
      organizationId,
    );
    const invitations = await this.repository.listInvitations(
      scope.organizationId,
    );
    return { items: invitations.map((item) => this.publicInvitation(item)) };
  }

  async revokeInvitation(
    user: AuthenticatedUser,
    organizationId: string,
    invitationId: string,
  ) {
    const scope = await this.authorizeInvitationManagement(
      user,
      organizationId,
    );
    const invitation = await this.repository.findInvitation({
      id: invitationId,
      organizationId: scope.organizationId,
    });
    if (!invitation || invitation.status !== 'pending') {
      throw PublicProblemException.invitationUnavailable();
    }
    await this.directory.revokeInvitation({
      organizationId: scope.organizationId,
      externalId: invitation.externalId,
      requestingUserId: user.id,
    });
    return this.publicInvitation(
      await this.repository.updateInvitation({
        ...invitation,
        status: 'revoked',
      }),
    );
  }

  async resendInvitation(
    user: AuthenticatedUser,
    organizationId: string,
    invitationId: string,
  ) {
    const scope = await this.authorizeInvitationManagement(
      user,
      organizationId,
    );
    const invitation = await this.repository.findInvitation({
      id: invitationId,
      organizationId: scope.organizationId,
    });
    if (
      !invitation ||
      invitation.status === 'accepted' ||
      invitation.externalId.startsWith('claim_')
    ) {
      throw PublicProblemException.invitationUnavailable();
    }
    if (scope.role === 'admin' && invitation.role === 'owner') {
      throw PublicProblemException.permissionDenied();
    }

    const claimExternalId = `claim_${randomUUID()}`;
    if (
      !(await this.repository.claimInvitationForResend({
        claimExternalId,
        expectedExternalId: invitation.externalId,
        expectedStatus: invitation.status,
        invitationId: invitation.id,
        organizationId: scope.organizationId,
      }))
    ) {
      throw PublicProblemException.invitationUnavailable();
    }

    let oldInvitationRevoked = invitation.status === 'revoked';
    let replacement: { expiresAt: Date; externalId: string } | undefined;
    try {
      if (!oldInvitationRevoked) {
        await this.directory.revokeInvitation({
          organizationId: scope.organizationId,
          externalId: invitation.externalId,
          requestingUserId: user.id,
        });
        oldInvitationRevoked = true;
      }
      replacement = await this.directory.createInvitation({
        organizationId: scope.organizationId,
        emailAddress: invitation.emailAddress,
        inviterUserId: user.id,
        role: invitation.role,
      });
      return this.publicInvitation(
        await this.repository.updateInvitation({
          ...invitation,
          externalId: replacement.externalId,
          expiresAt: replacement.expiresAt,
          invitedByUserId: user.id,
          status: 'pending',
        }),
      );
    } catch (error) {
      await Promise.allSettled([
        replacement
          ? this.directory.revokeInvitation({
              organizationId: scope.organizationId,
              externalId: replacement.externalId,
              requestingUserId: user.id,
            })
          : Promise.resolve(),
        this.repository.updateInvitation({
          ...invitation,
          status: oldInvitationRevoked ? 'revoked' : invitation.status,
        }),
      ]);
      throw error;
    }
  }

  async acceptInvitation(user: AuthenticatedUser, externalId: string) {
    const invitation =
      await this.repository.findInvitationByExternalId(externalId);
    if (
      !invitation ||
      invitation.status !== 'pending' ||
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      throw PublicProblemException.invitationUnavailable();
    }
    const acceptance = await this.directory.findInvitationAcceptance({
      externalId,
      organizationId: invitation.organizationId,
      userId: user.id,
    });
    if (acceptance?.status === 'membership-missing') {
      await this.repository.updateInvitation({
        ...invitation,
        status: 'revoked',
      });
      throw PublicProblemException.invitationUnavailable();
    }
    if (
      acceptance?.status !== 'accepted' ||
      acceptance.role !== invitation.role
    ) {
      throw PublicProblemException.invitationUnavailable();
    }

    try {
      return await this.repository.acceptInvitation({
        invitationId: invitation.id,
        organizationId: invitation.organizationId,
        role: acceptance.role,
        seatAllowance: await this.seats.findAllowance(
          invitation.organizationId,
        ),
        userId: user.id,
      });
    } catch (error) {
      if (error instanceof InvitationStateConflictError) {
        throw PublicProblemException.invitationUnavailable();
      }
      if (error instanceof SeatAllowanceExceededError) {
        await this.directory.deleteMembership({
          organizationId: invitation.organizationId,
          userId: user.id,
        });
        await this.repository.updateInvitation({
          ...invitation,
          status: 'revoked',
        });
        throw PublicProblemException.seatAllowanceExceeded();
      }
      throw error;
    }
  }

  async getAcceptedInvitation(user: AuthenticatedUser, externalId: string) {
    const accepted = await this.repository.findAcceptedInvitation({
      externalId,
      userId: user.id,
    });
    if (!accepted) throw PublicProblemException.invitationUnavailable();
    return accepted;
  }

  private authorizeInvitationManagement(
    user: AuthenticatedUser,
    organizationId: string,
  ) {
    return this.authorization.authorize({
      user,
      targetOrganizationId: organizationId,
      capability: Capability.organizationMemberships,
      permission: Permission.organizationMembershipsManage,
    });
  }

  private publicInvitation(invitation: OrganizationInvitation) {
    const {
      acceptedByUserId: _acceptedBy,
      externalId: _externalId,
      invitedByUserId: _inviter,
      ...result
    } = invitation;
    return {
      ...result,
      status:
        result.status === 'pending' && result.expiresAt.getTime() <= Date.now()
          ? ('expired' as const)
          : result.status,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  async getOnboarding(user: AuthenticatedUser) {
    const result = await this.repository.findOnboarding(user.id);
    return result
      ? { status: 'complete' as const, ...result }
      : { status: 'required' as const };
  }

  async getActiveOrganization(user: AuthenticatedUser) {
    if (!user.activeOrganization) {
      throw PublicProblemException.activeOrganizationRequired();
    }
    const scope = await this.authorization.authorize({
      user,
      targetOrganizationId: user.activeOrganization.id,
      capability: Capability.organizationSettings,
      permission: Permission.organizationSettingsRead,
    });
    const organization = await this.repository.getSettings(
      scope.organizationId,
    );
    return {
      id: user.activeOrganization.id,
      role: scope.role,
      slug: organization.slug,
      permissions:
        await this.authorization.permissionsForActiveOrganization(user),
    };
  }

  async updateSettings(
    user: AuthenticatedUser,
    organizationId: string,
    input: UpdateOrganizationSettingsDto,
  ) {
    const scope = await this.authorization.authorize({
      user,
      targetOrganizationId: organizationId,
      capability: Capability.organizationSettings,
      permission: Permission.organizationSettingsUpdate,
    });

    const previous = await this.repository.getSettings(scope.organizationId);
    let updated;
    try {
      updated = await this.repository.updateSettings({
        billingContactEmail: input.billingContactEmail,
        locale: input.locale,
        name: input.name,
        organizationId: scope.organizationId,
        slug: input.slug,
        timeZone: input.timeZone,
      });
    } catch (error) {
      if (error instanceof OrganizationSlugConflictError) {
        throw PublicProblemException.organizationSlugConflict();
      }
      throw error;
    }

    if (updated.name === previous.name && updated.slug === previous.slug) {
      return updated;
    }

    try {
      await this.directory.update({
        name: updated.name,
        organizationId: updated.id,
        slug: updated.slug,
      });
    } catch (error) {
      await this.repository.updateSettings({
        ...previous,
        organizationId: previous.id,
      });
      if (error instanceof OrganizationSlugConflictError) {
        throw PublicProblemException.organizationSlugConflict();
      }
      throw error;
    }

    return updated;
  }

  async getSettings(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorization.authorize({
      user,
      targetOrganizationId: organizationId,
      capability: Capability.organizationSettings,
      permission: Permission.organizationSettingsRead,
    });

    return this.repository.getSettings(scope.organizationId);
  }

  async exportData(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorization.authorize({
      user,
      targetOrganizationId: organizationId,
      capability: Capability.organizationSettings,
      permission: Permission.organizationDataExport,
    });

    return this.repository.getSettings(scope.organizationId);
  }

  async resolveSlug(user: AuthenticatedUser, slug: string) {
    const organization = await this.repository.resolveSlug(slug);
    if (!organization) throw PublicProblemException.permissionDenied();

    await this.authorization.authorizeMembership({
      user,
      targetOrganizationId: organization.id,
      capability: Capability.organizationSettings,
      permission: Permission.organizationSettingsRead,
    });
    return organization;
  }
}
