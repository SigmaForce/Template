import { createClerkClient } from '@clerk/backend';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import {
  OrganizationDirectory,
  OrganizationSlugConflictError,
} from './organization.js';
import { resolveOrganizationRole } from '../authorization/permission.js';

export class ClerkOrganizationDirectory extends OrganizationDirectory {
  private readonly client;

  constructor(secretKey: string) {
    super();
    this.client = createClerkClient({ secretKey });
  }

  async create(input: { name: string; slug: string; userId: string }) {
    let organization: { id: string };
    try {
      organization = await this.client.organizations.createOrganization({
        name: input.name,
        slug: input.slug,
        createdBy: input.userId,
      });
    } catch (error) {
      if (this.isSlugConflict(error)) {
        throw new OrganizationSlugConflictError();
      }
      throw error;
    }

    try {
      await this.client.organizations.updateOrganizationMembership({
        organizationId: organization.id,
        userId: input.userId,
        role: 'org:owner',
      });
    } catch (error) {
      await this.client.organizations.deleteOrganization(organization.id);
      throw error;
    }

    return organization;
  }

  async delete(organizationId: string) {
    await this.client.organizations.deleteOrganization(organizationId);
  }

  async createInvitation(input: {
    emailAddress: string;
    inviterUserId: string;
    organizationId: string;
    role: 'admin' | 'member' | 'owner';
  }) {
    const invitation =
      await this.client.organizations.createOrganizationInvitation({
        organizationId: input.organizationId,
        emailAddress: input.emailAddress,
        expiresInDays: 7,
        inviterUserId: input.inviterUserId,
        role: `org:${input.role}`,
      });
    return {
      externalId: invitation.id,
      expiresAt: new Date(invitation.expiresAt),
    };
  }

  async revokeInvitation(input: {
    externalId: string;
    organizationId: string;
    requestingUserId: string;
  }) {
    await this.client.organizations.revokeOrganizationInvitation({
      organizationId: input.organizationId,
      invitationId: input.externalId,
      requestingUserId: input.requestingUserId,
    });
  }

  async findAcceptedMembership(input: {
    externalId: string;
    organizationId: string;
    userId: string;
  }) {
    const invitation =
      await this.client.organizations.getOrganizationInvitation({
        organizationId: input.organizationId,
        invitationId: input.externalId,
      });
    if (invitation.status !== 'accepted') return undefined;

    const user = await this.client.users.getUser(input.userId);
    if (
      !user.emailAddresses.some(
        ({ emailAddress }) =>
          emailAddress.toLowerCase() === invitation.emailAddress.toLowerCase(),
      )
    ) {
      return undefined;
    }

    const memberships =
      await this.client.organizations.getOrganizationMembershipList({
        organizationId: input.organizationId,
        userId: [input.userId],
        limit: 1,
      });
    const role = resolveOrganizationRole(memberships.data[0]?.role);
    return role ? { role } : undefined;
  }

  private isSlugConflict(error: unknown) {
    return (
      isClerkAPIResponseError(error) &&
      error.errors.some(
        (item) =>
          item.code.toLowerCase().includes('slug') ||
          item.meta?.paramName === 'slug' ||
          item.meta?.name === 'slug',
      )
    );
  }
}
